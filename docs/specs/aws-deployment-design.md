# AWS Deployment Design: CWD Backend

> **Audience**: Students learning AWS infrastructure and deployment.
> Each section explains *what* the service does, *why* we chose it, and *how* it fits together.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Concepts We Need to Know](#concepts-we-need-to-know)
4. [AWS Services Breakdown](#aws-services-breakdown)
   - [VPC (Virtual Private Cloud)](#vpc-virtual-private-cloud)
   - [EC2 (Elastic Compute Cloud)](#ec2-elastic-compute-cloud)
   - [RDS MySQL](#rds-mysql)
   - [Elastic IP](#elastic-ip)
   - [Secrets Manager](#secrets-manager)
   - [DNS Setup (Squarespace)](#dns-setup-squarespace--no-route-53-needed)
5. [How a Request Flows Through the System](#how-a-request-flows-through-the-system)
6. [Server Setup: Nginx + PM2](#server-setup-nginx--pm2)
7. [SSL with Let's Encrypt (Certbot)](#ssl-with-lets-encrypt-certbot)
8. [CI/CD Pipeline (GitHub Actions)](#cicd-pipeline-github-actions)
9. [Infrastructure as Code (AWS CDK)](#infrastructure-as-code-aws-cdk)
10. [Security Model](#security-model)
11. [Cost Breakdown](#cost-breakdown)
12. [Environment Variables & Secrets](#environment-variables--secrets)
13. [How to Deploy From Scratch](#how-to-deploy-from-scratch)
14. [Common Operations](#common-operations)
15. [Upgrading to ECS Fargate (Future)](#upgrading-to-ecs-fargate-future)
16. [Glossary](#glossary)

---

## Overview

We're deploying the CWD donation management backend (Node.js/Express) to AWS. The goals are:

- **Reliability**: The app stays up and auto-restarts if it crashes.
- **Security**: Database is private, secrets are encrypted, HTTPS everywhere.
- **Automation**: Push to `main` on GitHub and it deploys automatically.
- **Low cost**: ~$27/mo (or ~$4/mo with AWS free tier).
- **Reproducibility**: All infrastructure is defined in code (AWS CDK) so anyone on the team can recreate it.

### Deployment Topology

- **Frontend**: Vercel (`yourapp.com`) — Vercel handles domain, SSL, CDN automatically
- **Backend**: AWS (`api.yourapp.com`) — this document covers this deployment
- **Domain DNS**: Managed via Squarespace — we add DNS records there for both Vercel and AWS

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| App Runtime | Node.js 22 + Express 5 | The backend API |
| Compute | EC2 (t3.micro) | Runs the app on a virtual server |
| Reverse Proxy | Nginx | Routes traffic, terminates SSL |
| Process Manager | PM2 | Keeps Node.js alive, auto-restarts on crash |
| SSL | Let's Encrypt (Certbot) | Free HTTPS certificate, auto-renewed |
| Database | RDS MySQL 8.0 | Stores donors, donations, users |
| DNS | Squarespace (existing) | CNAME record pointing `api.yourapp.com` to EC2 |
| Secrets | AWS Secrets Manager | Stores DB credentials and Firebase key |
| CI/CD | GitHub Actions | Builds and deploys on push to main |
| Infrastructure | AWS CDK (TypeScript) | Defines all AWS resources as code |

---

## Architecture Diagram

```
                         Internet
                            |
                  [Squarespace DNS]
            (api.yourapp.com → Elastic IP)
                            |
               +------------+------------+
               |     EC2 Instance        |
               |     (Public Subnet)     |
               |                         |
               |  [Nginx]                |
               |   - Port 80 → redirect  |
               |     to 443              |
               |   - Port 443 → SSL      |
               |     (Let's Encrypt)     |
               |   - Proxy to :5050      |
               |                         |
               |  [PM2 → Node.js]        |
               |   - Express API         |
               |   - Port 5050           |
               +------------+------------+
                       |           |
              Port 3306 |           | HTTPS (443)
                       |           |
            +----------+           |
            | RDS MySQL |     Firebase APIs
            | Private   |     (direct from EC2
            | Subnet    |      — no NAT needed)
            | (AZ-1+2)  |
            +----------+

   +----------------------------------------------------------+
   |                    Secrets Manager                        |
   |  - cwd/db-credentials (host, user, password, db name)   |
   |  - cwd/firebase-key (service account JSON)              |
   +----------------------------------------------------------+
```

### What's happening here?

1. The frontend (on Vercel) makes an API call to `https://api.yourapp.com/donors`.
2. **Squarespace DNS** resolves `api.yourapp.com` to the EC2's Elastic IP (via an A record we set up once).
3. **Nginx** on the EC2 instance receives the HTTPS request, decrypts it using the Let's Encrypt certificate, and forwards plain HTTP to Node.js on port 5050.
4. **Express** (managed by PM2) handles the request.
5. If the app needs data, it queries **RDS MySQL** over the private network.
6. If the app needs to verify a Firebase token, it calls Firebase APIs directly over the internet (EC2 is in a public subnet, so no NAT Gateway needed).
7. The response flows back: Express -> Nginx -> User.

---

## Concepts We Need to Know

Before diving into the services, here are some foundational concepts.

### Subnets: Public vs. Private

A **subnet** is a section of a network. In AWS:

- **Public subnet**: Has a route to the internet. Resources here can be reached from the outside (like our EC2 instance).
- **Private subnet**: No direct internet access. Resources here are hidden from the outside world (like our database).

We put the EC2 instance in a public subnet (it needs to receive requests and reach Firebase APIs) and the database in a private subnet (only the EC2 instance should talk to it).

### Availability Zones (AZs)

AWS data centers are organized into **Availability Zones** — physically separate buildings with independent power and networking. If one AZ has a fire or power outage, the others keep running.

We use 2 AZs for the RDS subnet group (AWS requires it), but our EC2 instance runs in a single AZ. If that AZ goes down, the app is down — acceptable for a student project.

### Security Groups

A **security group** is a firewall for an individual resource. We define rules like:
- "Allow inbound traffic on port 443 from anywhere" (for the EC2 instance)
- "Allow inbound traffic on port 3306 only from the EC2 security group" (for RDS)

If a rule doesn't exist, the traffic is blocked. This is how we ensure only the app can talk to the database.

### IAM (Identity and Access Management)

**IAM** controls *who* (or *what*) can do *what* in our AWS account. Key concepts:

- **User**: A person who logs into the AWS console.
- **Role**: An identity that AWS services assume. For example, our EC2 instance assumes a role that lets it read secrets from Secrets Manager.
- **Policy**: A JSON document that defines permissions (e.g., "allow reading from this specific secret").

We never put AWS credentials in our code. Instead, the EC2 instance assumes an IAM role that grants exactly the permissions it needs — nothing more.

---

## AWS Services Breakdown

### VPC (Virtual Private Cloud)

**What it is**: Our own private network inside AWS. Every resource we create lives inside this VPC. Think of it as renting a floor in a building — we control who can enter and how rooms connect.

**Why we need it**: Isolation. Without a VPC, our resources would be on the default shared network. A custom VPC lets us control the network topology — what's public, what's private, and what can talk to what.

**Our configuration**:

| Setting | Value | Why |
|---------|-------|-----|
| CIDR Block | `10.0.0.0/16` | Gives us 65,536 IP addresses — way more than we need, but it's the standard size. |
| Public Subnet 1 | `10.0.1.0/24` (AZ-1) | Hosts the EC2 instance. |
| Public Subnet 2 | `10.0.2.0/24` (AZ-2) | Available for future use. |
| Private Subnet 1 | `10.0.3.0/24` (AZ-1) | Hosts RDS. |
| Private Subnet 2 | `10.0.4.0/24` (AZ-2) | RDS subnet group requires 2 AZs. |

**The `/24` notation** is CIDR — it means "the first 24 bits are the network, the last 8 are for hosts," giving 256 addresses per subnet.

**No NAT Gateway needed**: Since our EC2 instance is in a public subnet, it can reach the internet directly (for Firebase API calls, npm installs, etc.). This saves us ~$32/mo compared to the Fargate approach.

---

### EC2 (Elastic Compute Cloud)

**What it is**: A virtual server in the cloud. We choose the operating system, instance size (CPU/RAM), and we have full control — just like having our own Linux server, but hosted by AWS.

**Why we chose it**: It's the cheapest way to run a small production app on AWS. A `t3.micro` instance costs ~$8/mo (or free for 12 months with the AWS free tier) and has more than enough power for an Express API with a handful of users.

**Our configuration**:

| Setting | Value | Why |
|---------|-------|-----|
| Instance Type | `t3.micro` | 2 vCPU, 1 GB RAM. More than enough for Express. Free tier eligible. |
| AMI | Amazon Linux 2023 | Latest Amazon Linux — lightweight, well-supported, pre-configured for AWS. |
| Subnet | Public Subnet 1 | Needs internet access (inbound from users, outbound to Firebase). |
| Key Pair | Created via CDK | For SSH access (emergencies only — deploys are automated). |
| User Data | Bootstrap script | Installs Node.js 22, Nginx, PM2, Certbot on first boot. |
| IAM Role | `cwd-ec2-role` | Allows reading from Secrets Manager. |
| Auto Recovery | Enabled | If the underlying hardware fails, AWS auto-restarts the instance. |

**What's "User Data"?** A script that runs automatically when the EC2 instance first boots. We use it to install everything the server needs:

```bash
#!/bin/bash
# Install Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Install Nginx
yum install -y nginx

# Install PM2 globally
npm install -g pm2

# Install Certbot for SSL
yum install -y certbot python3-certbot-nginx

# Clone the repo and install deps
cd /home/ec2-user
git clone https://github.com/YOUR_ORG/cwd-backend.git
cd cwd-backend
npm ci --omit=dev

# Start the app with PM2
pm2 start src/server.js --name cwd-backend
pm2 startup  # Auto-start PM2 on reboot
pm2 save
```

This means we never need to SSH in and manually set up the server — it configures itself.

---

### RDS MySQL

**What it is**: Amazon's managed database service. "Managed" means AWS handles the hard parts — backups, patching, failover, and monitoring. We just connect and run queries.

**Why we chose it**: Our app already uses MySQL, and we have the `rds-config.ini` template ready. RDS eliminates the operational burden of running MySQL ourselves (no need to worry about disk space, backup scripts, or security patches).

**Our configuration**:

| Setting | Value | Why |
|---------|-------|-----|
| Engine | MySQL 8.0 | Matches our local Docker MySQL version. |
| Instance Class | `db.t3.micro` | 1 vCPU, 1 GB RAM. Plenty for a small production app. Free tier eligible for 12 months. |
| Storage | 20 GB gp3 | General purpose SSD. gp3 is cheaper than gp2 and has consistent performance. |
| Multi-AZ | No | Would double the cost (~$30/mo). Not needed at this scale — automated backups protect against data loss. |
| Backup Retention | 7 days | Automated daily backups. Can restore to any point in the last 7 days. |
| Public Access | No | Only accessible from within the VPC (from the EC2 instance). |
| Encryption | Yes (default KMS key) | Data encrypted at rest — an AWS best practice. |
| Deletion Protection | Yes | Prevents accidental deletion via console or CLI. |

**How it connects**: The EC2 instance connects to RDS via the private network (both are in the same VPC). The RDS security group only allows inbound traffic on port 3306 from the EC2 security group. No one else can reach it — not even us, unless we SSH into the EC2 instance first.

**Important**: The database schema needs to be applied after the RDS instance is created. We'll run the `sql/create_tables_mysql.sql` script as a one-time setup step (covered in [How to Deploy From Scratch](#how-to-deploy-from-scratch)).

---

### Elastic IP

**What it is**: A static public IP address that we assign to our EC2 instance. Without it, the instance gets a new IP address every time it restarts — breaking the DNS record.

**Why we need it**: Our Squarespace DNS record points `api.yourapp.com` to the EC2's IP address. If the IP changes (e.g., after a reboot), the DNS record would point to nothing. An Elastic IP stays the same even if the instance restarts.

**Cost**: Free while attached to a running instance. ~$3.65/mo if the instance is stopped (AWS charges for unused Elastic IPs to discourage hoarding).

---

### Secrets Manager

**What it is**: A secure vault for storing sensitive configuration like database passwords, API keys, and service account credentials. Secrets are encrypted at rest and in transit.

**Why we need it**: We should *never* put secrets in our code, `.env` files committed to the repo, or hardcode them anywhere. Secrets Manager encrypts them, controls access via IAM, and provides an audit trail of who accessed what.

**Our secrets**:

| Secret Name | Contents | Used By |
|-------------|----------|---------|
| `cwd/db-credentials` | `{ host, port, username, password, dbname }` | EC2 → connects to RDS |
| `cwd/firebase-key` | Firebase service account JSON | EC2 → verifies Firebase tokens |

**How the EC2 instance reads them**: On startup (and on each deploy), a script uses the AWS CLI to fetch secrets and write them to a `.env` file that the app reads:

```bash
# Fetch secrets and create .env
aws secretsmanager get-secret-value --secret-id cwd/db-credentials \
  --query 'SecretString' --output text | jq -r 'to_entries[] | "\(.key)=\(.value)"' >> .env

aws secretsmanager get-secret-value --secret-id cwd/firebase-key \
  --query 'SecretString' --output text > /tmp/firebase-key.json
echo "FIREBASE_SERVICE_ACCOUNT_KEY=$(cat /tmp/firebase-key.json)" >> .env
rm /tmp/firebase-key.json
```

The EC2 instance's IAM role grants permission to read these specific secrets — nothing else.

---

### DNS Setup (Squarespace — No Route 53 Needed)

**Why no Route 53?** Our domain is already managed in Squarespace. Moving DNS to Route 53 would add complexity and cost (~$0.50/mo) for no benefit. We just need one DNS record:

| Record Type | Name | Value | Purpose |
|-------------|------|-------|---------|
| A | `api.yourapp.com` | `<Elastic IP address>` | Points our API subdomain to the EC2 instance |

**How to add this in Squarespace**:
1. Go to Squarespace domain settings -> DNS Settings -> Custom Records
2. Add an A record: Host = `api`, Data = the Elastic IP (CDK will output this after deployment)
3. Wait a few minutes for DNS propagation

That's it — no Route 53 hosted zone, no nameserver changes, no extra AWS charges.

**Note**: Unlike the Fargate approach (which uses CNAME to point to an ALB), we use an A record pointing directly to the Elastic IP. This is simpler and works perfectly for a single-server setup.

---

## How a Request Flows Through the System

Let's trace a real request: **"Get all donors"** from the frontend.

```
1. Frontend (React on Vercel) makes a request:
   GET https://api.yourapp.com/donors
   Headers: { Authorization: "Bearer <firebase-id-token>" }

2. DNS Resolution (Squarespace):
   api.yourapp.com → A record → 52.x.x.x (Elastic IP)

3. Nginx (on EC2):
   - Receives the HTTPS request on port 443
   - Decrypts it using the Let's Encrypt certificate
   - Forwards plain HTTP to localhost:5050

4. Express (managed by PM2):
   a. Express receives: GET /donors
   b. authMiddleware.js runs:
      - Extracts the Bearer token from the Authorization header
      - Calls Firebase Admin SDK to verify the token
      - Firebase SDK makes an HTTPS call to Google's servers
        (EC2 is in a public subnet — goes directly to the internet)
      - Token is valid → attaches user info to req.user
   c. requireApprovalMiddleware.js runs:
      - Checks req.user.role !== 'pending'
   d. donorController.js runs:
      - Calls donorRepository.getAll()
      - Repository executes SQL: SELECT * FROM donors ...
      - SQL goes to RDS MySQL over private network (port 3306)
      - Results come back
   e. Express sends JSON response

5. Response flows back:
   Express (:5050) → Nginx (encrypts to HTTPS) → Internet → Frontend
```

**Total latency**: Typically 50-200ms depending on Firebase token verification caching.

---

## Server Setup: Nginx + PM2

### What is Nginx?

**Nginx** (pronounced "engine-x") is a web server and reverse proxy. In our setup, it does three things:

1. **SSL termination**: Handles HTTPS encryption/decryption so the Express app doesn't have to.
2. **Reverse proxy**: Forwards requests from port 443 (HTTPS) to port 5050 (the Express app).
3. **HTTP redirect**: Redirects any HTTP (port 80) requests to HTTPS (port 443).

**Nginx config** (`/etc/nginx/conf.d/cwd-backend.conf`):

```nginx
server {
    listen 80;
    server_name api.yourapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourapp.com;

    ssl_certificate /etc/letsencrypt/live/api.yourapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourapp.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Why not just run Express on port 443 directly?**
- Binding to ports below 1024 requires root privileges — a security risk.
- Nginx is battle-tested for handling SSL, concurrent connections, and edge cases.
- If we ever add a second service, Nginx can route to both.

### What is PM2?

**PM2** is a process manager for Node.js. It keeps the app running and restarts it automatically if it crashes. Key features:

- **Auto-restart on crash**: If the Express app throws an unhandled error and exits, PM2 restarts it immediately.
- **Auto-start on reboot**: `pm2 startup` creates a system service, so the app starts when the EC2 instance boots.
- **Log management**: PM2 captures stdout/stderr and rotates log files.
- **Zero-config clustering**: (Future) PM2 can run multiple instances of the app to use all CPU cores.

**Common PM2 commands**:

```bash
pm2 start src/server.js --name cwd-backend  # Start the app
pm2 restart cwd-backend                      # Restart
pm2 stop cwd-backend                         # Stop
pm2 logs cwd-backend                         # View logs
pm2 monit                                    # Real-time monitoring dashboard
pm2 list                                     # List all running processes
```

---

## SSL with Let's Encrypt (Certbot)

### What is Let's Encrypt?

**Let's Encrypt** is a free certificate authority. It provides SSL/TLS certificates so our site can use HTTPS — for free. **Certbot** is the tool that automates getting and renewing these certificates.

### How It Works

1. **First time**: Run `certbot --nginx -d api.yourapp.com`. Certbot:
   - Contacts Let's Encrypt servers
   - Proves we control the domain (via a challenge on port 80)
   - Downloads the certificate files
   - Automatically updates the Nginx config to use them

2. **Renewal**: Certificates expire every 90 days. Certbot sets up a cron job (automatic timer) that checks twice a day and renews if needed. We never have to think about it.

### Setup Command

```bash
# Get the certificate (run once after DNS is configured)
sudo certbot --nginx -d api.yourapp.com --non-interactive --agree-tos -m our-email@example.com

# Verify auto-renewal is configured
sudo certbot renew --dry-run
```

**Important**: Certbot needs port 80 to be open for the domain validation challenge. Our security group allows this.

### Why Not ACM?

In the Fargate approach, we'd use AWS Certificate Manager (ACM) because ACM certificates can only be attached to AWS services like ALB and CloudFront — not to Nginx running on EC2. For EC2 + Nginx, Let's Encrypt/Certbot is the standard (and free) solution.

---

## CI/CD Pipeline (GitHub Actions)

### Overview

Every push to the `main` branch triggers an automated pipeline:

```
Push to main
     |
     v
[Checkout Code]
     |
     v
[Configure AWS Credentials via OIDC]
     |
     v
[SSH into EC2]
     |
     v
[Git pull latest code]
     |
     v
[npm ci --omit=dev]
     |
     v
[Fetch latest secrets from Secrets Manager]
     |
     v
[PM2 restart cwd-backend]
     |
     v
[Health check: curl localhost:5050/health]
     |
     v
Done! New version is live.
```

### OIDC vs Access Keys

**The old way**: Create an IAM user, generate access keys, store them in GitHub Secrets. Problem: long-lived credentials that could leak.

**The better way (OIDC)**: GitHub Actions assumes an IAM role directly using OpenID Connect. No access keys to manage or rotate. AWS trusts GitHub's identity provider, and the role is scoped to only our repository.

### How GitHub Actions SSHes into EC2

GitHub Actions uses the `appleboy/ssh-action` to connect to the EC2 instance. The SSH private key is stored as a GitHub Secret. The deploy script runs on the EC2 instance:

```bash
cd /home/ec2-user/cwd-backend
git pull origin main
npm ci --omit=dev

# Refresh secrets from Secrets Manager
./scripts/fetch-secrets.sh

# Restart the app
pm2 restart cwd-backend

# Verify it's healthy
sleep 2
curl -f http://localhost:5050/health || exit 1
```

### GitHub Secrets Required

| Secret | Value | Where to Get It |
|--------|-------|-----------------|
| `EC2_HOST` | Elastic IP address | CDK output |
| `EC2_SSH_KEY` | Private key for EC2 | Created during CDK deploy |
| `EC2_USERNAME` | `ec2-user` | Default for Amazon Linux |

### Rollback

If a bad deploy makes it through:
1. SSH into the EC2: `ssh -i key.pem ec2-user@<elastic-ip>`
2. Roll back: `git checkout <previous-commit>` && `npm ci --omit=dev` && `pm2 restart cwd-backend`
3. Or revert the commit on `main` and push — triggers a new deploy with the previous code.

### Deployment Downtime

There's a brief ~1-2 second downtime during `pm2 restart`. For a site with a handful of users, this is negligible. If it becomes a problem, PM2's `--update-env` and graceful reload features can reduce it to near-zero.

---

## Infrastructure as Code (AWS CDK)

### What is CDK?

The **AWS Cloud Development Kit** lets us define AWS infrastructure using real programming languages (we use TypeScript). Instead of clicking through the AWS Console or writing YAML templates, we write code like:

```typescript
const instance = new ec2.Instance(this, 'Backend', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  vpc,
});
```

CDK converts this into a **CloudFormation template** (AWS's native infrastructure-as-code format) and deploys it. Think of CDK as a higher-level, developer-friendly wrapper around CloudFormation.

### Why CDK over Terraform/CloudFormation?

- **TypeScript**: We're already in a JS/TS codebase. No new language to learn.
- **Type safety**: Autocomplete and compile-time errors catch misconfigurations before deployment.
- **Higher-level constructs**: CDK has "L2 constructs" that set sensible defaults, reducing boilerplate.
- **Same repo**: Lives in `infra/` alongside the app code.

### Project Structure

```
cwd-backend/
└── infra/
    ├── bin/
    │   └── infra.ts              # CDK app entry point — instantiates stacks
    ├── lib/
    │   ├── network-stack.ts      # VPC, subnets
    │   ├── database-stack.ts     # RDS MySQL, security group, secrets
    │   ├── compute-stack.ts      # EC2, Elastic IP, security group, IAM role
    │   └── cicd-stack.ts         # GitHub OIDC role, IAM policies
    ├── scripts/
    │   └── user-data.sh          # EC2 bootstrap script
    ├── cdk.json                  # CDK configuration
    ├── tsconfig.json             # TypeScript configuration
    └── package.json              # CDK dependencies
```

### Stack Breakdown

We split infrastructure into **stacks** — independent units that can be deployed separately. This is useful because:
- The network rarely changes. The compute instance changes more often.
- If a compute stack deploy fails, it doesn't affect the network or database.
- Different team members can work on different stacks.

**Stack 1 — Network** (`network-stack.ts`):
- VPC with 2 public + 2 private subnets
- No NAT Gateway needed (EC2 is in a public subnet)
- This stack is deployed once and rarely touched.

**Stack 2 — Database** (`database-stack.ts`):
- RDS MySQL instance
- Security group (inbound 3306 from EC2 security group)
- Secrets Manager secret for DB credentials
- This stack is deployed once. Updates are rare (e.g., changing instance size).

**Stack 3 — Compute** (`compute-stack.ts`):
- EC2 instance with user data bootstrap script
- Elastic IP
- Security group (inbound 80, 443, 22 from our IP)
- IAM role for Secrets Manager access
- Secrets Manager secret for Firebase key
- This stack manages the server itself.

**Stack 4 — CI/CD** (`cicd-stack.ts`):
- GitHub OIDC identity provider
- IAM role for GitHub Actions
- Deployed once, updated if we need to change CI permissions.

### CDK Commands

```bash
cd infra

# See what changes CDK would make (like a dry run)
npx cdk diff

# Deploy all stacks
npx cdk deploy --all

# Deploy a specific stack
npx cdk deploy CwdNetworkStack

# Destroy all stacks (careful — deletes everything!)
npx cdk destroy --all
```

---

## Security Model

### Network Security (Defense in Depth)

```
Internet
   |
   | Only ports 80, 443 allowed (EC2 security group)
   | Port 22 restricted to our IP only
   v
  EC2 (public subnet)
   |
   | Only port 3306 from EC2 allowed (RDS security group)
   v
  RDS (private subnet, no public access)
```

Two layers of protection. Even if someone somehow got into the EC2 instance, they'd still need to authenticate to MySQL. And the database is completely invisible from the internet.

### SSH Access

SSH (port 22) is restricted to specific IP addresses in the security group. This means only our team can SSH into the server. The CDK stack lets us configure which IPs are allowed.

**Best practice**: Only open SSH when we need it. We can also use **AWS Systems Manager Session Manager** to connect without opening port 22 at all (included in our CDK config).

### Secrets Management

| Practice | Implementation |
|----------|---------------|
| No hardcoded secrets | All secrets in Secrets Manager |
| No `.env` in repo | `.env` generated on server from Secrets Manager |
| No long-lived AWS credentials | GitHub Actions uses OIDC (temporary tokens) |
| Least privilege IAM | EC2 role can only read its own secrets |
| Encryption at rest | RDS encrypted, Secrets Manager encrypted |
| Encryption in transit | HTTPS everywhere (Nginx → user, EC2 → Firebase) |
| No public database | RDS in private subnet, no public IP |

### Application Security (Already in Our Code)

- **Firebase token verification**: Every request (except `/health`) is authenticated.
- **Parameterized SQL queries**: Both MySQL and Postgres providers use parameterized queries, preventing SQL injection.
- **CORS configuration**: Only our frontend URL is allowed.
- **Role-based access**: Admin endpoints are protected by `adminMiddleware`.

---

## Cost Breakdown

Monthly costs for `us-east-1`:

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| EC2 | t3.micro (2 vCPU, 1 GB RAM) | ~$8 (free tier: $0) |
| RDS MySQL | db.t3.micro, single-AZ, 20GB gp3 | ~$15 (free tier: $0) |
| Elastic IP | 1 static IP (attached to running instance) | ~$3.65 |
| Secrets Manager | 2 secrets | ~$0.80 |
| CloudWatch | Basic monitoring | Free |
| Data Transfer | ~1 GB/mo outbound | Free (first 100 GB) |
| **Total** | | **~$27/mo** |
| **Total (with free tier)** | | **~$4/mo** |

### AWS Free Tier

If our AWS account is less than 12 months old, we get:
- **EC2**: 750 hours/mo of t3.micro (enough for 1 instance running 24/7)
- **RDS**: 750 hours/mo of db.t3.micro + 20 GB storage
- **Data Transfer**: 100 GB/mo outbound

This brings the total to just ~$4.45/mo (Elastic IP + Secrets Manager).

---

## Environment Variables & Secrets

### In Production (EC2)

These environment variables are loaded from a `.env` file on the server, generated from Secrets Manager:

| Variable | Source | Value |
|----------|--------|-------|
| `NODE_ENV` | `.env` (static) | `production` |
| `PORT` | `.env` (static) | `5050` |
| `DATABASE_CLIENT` | `.env` (static) | `mysql` |
| `FRONTEND_URL` | `.env` (static) | `https://yourapp.com` (Vercel frontend) |
| `FRONTEND_URL_DEV` | `.env` (static) | (not set in production) |
| `API_URL` | `.env` (static) | `https://api.yourapp.com` |
| `DB_HOST` | Secrets Manager -> `.env` | RDS endpoint |
| `DB_PORT` | Secrets Manager -> `.env` | `3306` |
| `db_name` | Secrets Manager -> `.env` | `cwd_db` |
| `dev_user` | Secrets Manager -> `.env` | RDS username |
| `dev_password` | Secrets Manager -> `.env` | RDS password |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Secrets Manager -> `.env` | Service account JSON |

### The `fetch-secrets.sh` Script

A helper script that pulls secrets from Secrets Manager and writes the `.env` file:

```bash
#!/bin/bash
# scripts/fetch-secrets.sh — run on EC2 during deploy

ENV_FILE="/home/ec2-user/cwd-backend/.env"

# Static config
cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=5050
DATABASE_CLIENT=mysql
FRONTEND_URL=https://yourapp.com
API_URL=https://api.yourapp.com
EOF

# DB credentials from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id cwd/db-credentials \
  --query 'SecretString' --output text)

echo "DB_HOST=$(echo $DB_SECRET | jq -r '.host')" >> "$ENV_FILE"
echo "DB_PORT=$(echo $DB_SECRET | jq -r '.port')" >> "$ENV_FILE"
echo "db_name=$(echo $DB_SECRET | jq -r '.dbname')" >> "$ENV_FILE"
echo "dev_user=$(echo $DB_SECRET | jq -r '.username')" >> "$ENV_FILE"
echo "dev_password=$(echo $DB_SECRET | jq -r '.password')" >> "$ENV_FILE"

# Firebase key from Secrets Manager
FIREBASE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id cwd/firebase-key \
  --query 'SecretString' --output text)
echo "FIREBASE_SERVICE_ACCOUNT_KEY='$FIREBASE_KEY'" >> "$ENV_FILE"

chmod 600 "$ENV_FILE"
```

### Changes Needed in `src/config/database.js`

The current code reads env vars like `dev_user` and `dev_password`. These names are fine — the `fetch-secrets.sh` script writes them with the same names. No code changes needed as long as we match the secret field names to the expected env var names.

---

## How to Deploy From Scratch

Step-by-step guide for the first deployment:

### Prerequisites

1. **AWS Account** with admin access
2. **AWS CLI** installed and configured (`aws configure`)
3. **Node.js 22** installed locally
4. **Domain name** with access to Squarespace DNS settings
5. **GitHub repository** for `cwd-backend`

### Steps

```
Step 1: Install CDK dependencies
   cd cwd-backend/infra && npm install

Step 2: Bootstrap CDK (one-time per AWS account/region)
   npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

Step 3: Update cdk.json with our configuration
   - Domain name (e.g., api.yourapp.com)
   - Our IP address (for SSH access)
   - GitHub repo (for OIDC)

Step 4: Deploy network stack
   npx cdk deploy CwdNetworkStack

Step 5: Deploy database stack
   npx cdk deploy CwdDatabaseStack
   (Note the RDS endpoint from the output)

Step 6: Deploy compute stack
   npx cdk deploy CwdComputeStack
   CDK will output:
   - Elastic IP address
   - EC2 instance ID
   - SSH key (saved to a file)
   The EC2 instance auto-configures via user data script
   (installs Node.js, Nginx, PM2, clones repo, starts app)

Step 7: Add DNS record in Squarespace
   Go to Squarespace → Domains → DNS Settings → Custom Records
   Add an A record:
     Host: api
     Data: <Elastic IP from Step 6>
   Wait a few minutes for DNS propagation.

Step 8: SSH into EC2 and set up SSL
   ssh -i key.pem ec2-user@<elastic-ip>
   sudo certbot --nginx -d api.yourapp.com --non-interactive \
     --agree-tos -m our-email@example.com

Step 9: Run database schema setup
   While SSH'd into the EC2, connect to RDS:
   mysql -h <rds-endpoint> -u <username> -p < sql/create_tables_mysql.sql
   Optionally: mysql -h <rds-endpoint> -u <username> -p < sql/seed.sql

Step 10: Deploy CI/CD stack
   npx cdk deploy CwdCicdStack

Step 11: Configure GitHub repository
   Add secrets: EC2_HOST, EC2_SSH_KEY, EC2_USERNAME
   Add the GitHub Actions workflow file (.github/workflows/deploy.yml)

Step 12: Verify
   curl https://api.yourapp.com/health
   Should return: { "status": "ok" }
```

### First Database Setup

Since RDS is in a private subnet, we can't connect to it from our laptops directly. But the EC2 instance is in the same VPC, so we can connect from there:

```bash
# SSH into EC2
ssh -i key.pem ec2-user@<elastic-ip>

# Connect to RDS (password will be prompted)
mysql -h <rds-endpoint> -u admin -p

# Run the schema
mysql> source /home/ec2-user/cwd-backend/sql/create_tables_mysql.sql;

# Optionally seed test data
mysql> source /home/ec2-user/cwd-backend/sql/seed.sql;
```

This is much simpler than the Fargate approach (which would need a bastion host or SSM session), because we already have an EC2 instance in the VPC.

---

## Common Operations

### Viewing Logs

```bash
# SSH into the EC2 instance
ssh -i key.pem ec2-user@<elastic-ip>

# View app logs (PM2)
pm2 logs cwd-backend          # Live streaming
pm2 logs cwd-backend --lines 100  # Last 100 lines

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Restarting the App

```bash
ssh -i key.pem ec2-user@<elastic-ip>
pm2 restart cwd-backend
```

### Checking App Status

```bash
ssh -i key.pem ec2-user@<elastic-ip>
pm2 list                      # See running processes
pm2 monit                     # Real-time CPU/memory dashboard
curl localhost:5050/health     # Check health endpoint
```

### Updating a Secret

```bash
# Update a secret value (from a local machine)
aws secretsmanager update-secret \
  --secret-id cwd/db-credentials \
  --secret-string '{"host":"...","port":"3306","username":"...","password":"...","dbname":"cwd_db"}'

# Then SSH into EC2 and refresh
ssh -i key.pem ec2-user@<elastic-ip>
cd cwd-backend
./scripts/fetch-secrets.sh
pm2 restart cwd-backend
```

### Server Maintenance

Set a monthly reminder to:

```bash
ssh -i key.pem ec2-user@<elastic-ip>

# Update OS packages
sudo yum update -y

# Check disk space
df -h

# Check memory usage
free -m

# Check SSL certificate expiry (should auto-renew)
sudo certbot certificates
```

### Manual Deploy (Emergency)

If GitHub Actions is down or we need to deploy manually:

```bash
ssh -i key.pem ec2-user@<elastic-ip>
cd cwd-backend
git pull origin main
npm ci --omit=dev
./scripts/fetch-secrets.sh
pm2 restart cwd-backend
```

---

## Upgrading to ECS Fargate (Future)

When the project outgrows a single EC2 instance, here's the upgrade path to a fully managed, auto-scaling setup. **No app code changes are needed** — only the infrastructure changes.

### When to Upgrade

- We need **zero-downtime deployments** (multiple users relying on the API 24/7)
- We're **tired of server management** (OS updates, disk space, security patches)
- We need **horizontal scaling** (multiple instances behind a load balancer)
- The project grows into a **real production app**

### What Changes

| Component | EC2 (current) | Fargate (upgrade) |
|-----------|---------------|-------------------|
| Compute | EC2 t3.micro | ECS Fargate (0.25 vCPU, 0.5 GB) |
| Load Balancer | Nginx on EC2 | ALB (~$16/mo) |
| SSL | Certbot/Let's Encrypt | ACM (free, auto-renewing) |
| Process Manager | PM2 | ECS (auto-restarts, rolling deploys) |
| Container | None | Docker (Dockerfile needed) |
| NAT Gateway | Not needed | Required (~$32/mo) |
| Container Registry | Not needed | ECR (~$0.05/mo) |
| Deploys | SSH → git pull → PM2 restart | GitHub Actions → build image → push to ECR → update ECS |
| **Monthly Cost** | **~$27** | **~$74** |

### Migration Steps

1. Add a `Dockerfile` to the repo (see below)
2. Add new CDK stacks for ECR, ECS, ALB, NAT Gateway
3. Deploy the new stacks alongside the existing EC2 setup
4. Update the Squarespace DNS CNAME to point to the ALB instead of the Elastic IP
5. Verify everything works
6. Tear down the EC2 stack

### Dockerfile (for Future Use)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ src/
COPY sql/ sql/
EXPOSE 5050
CMD ["node", "src/server.js"]
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **A Record** | A DNS record that maps a domain name directly to an IP address. |
| **AZ** | Availability Zone — a physically separate data center within an AWS region. |
| **CDK** | Cloud Development Kit — define AWS infrastructure using TypeScript (or other languages). |
| **Certbot** | A tool that automates getting and renewing free SSL certificates from Let's Encrypt. |
| **CIDR** | Classless Inter-Domain Routing — notation for IP address ranges (e.g., `10.0.0.0/16`). |
| **CloudFormation** | AWS's native infrastructure-as-code service. CDK generates CloudFormation templates. |
| **CNAME** | A DNS record that points one domain name to another (e.g., `api.yourapp.com` → ALB URL). |
| **EC2** | Elastic Compute Cloud — virtual servers in the cloud. |
| **Elastic IP** | A static public IP address assigned to an EC2 instance. |
| **IAM** | Identity and Access Management — controls who can do what in AWS. |
| **Let's Encrypt** | A free certificate authority that provides SSL/TLS certificates. |
| **Nginx** | A web server and reverse proxy — handles HTTPS and forwards requests to the app. |
| **OIDC** | OpenID Connect — protocol for federated authentication (used by GitHub Actions). |
| **PM2** | A process manager for Node.js — keeps the app running and restarts on crash. |
| **RDS** | Relational Database Service — managed databases (MySQL, PostgreSQL, etc.). |
| **Reverse Proxy** | A server that sits in front of an app, forwarding client requests to it. |
| **Security Group** | A virtual firewall that controls inbound/outbound traffic for AWS resources. |
| **Secrets Manager** | Securely stores and manages secrets (passwords, API keys, etc.). |
| **Subnet** | A range of IP addresses within a VPC. Can be public or private. |
| **User Data** | A script that runs automatically when an EC2 instance first boots. |
| **VPC** | Virtual Private Cloud — an isolated network within AWS. |
