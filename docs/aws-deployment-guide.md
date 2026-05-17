# AWS Deployment Operations Guide

This doc covers our AWS infrastructure for cwd-backend — what we set up, how it works, and how to do common operations.

## 1. Architecture Overview

Our backend runs on a single EC2 instance with a managed RDS database:

- **EC2** (Amazon Linux 2023, t3.micro) — runs our Node.js/Express app
- **RDS** (MySQL 8.0, db.t3.micro) — managed database in a private subnet
- **Nginx** — reverse proxy, forwards traffic to Node.js on port 5050
- **PM2** — process manager, keeps the app running and handles restarts

The EC2 instance sits in a public subnet and is accessible via Elastic IP `32.194.5.150` (domain: `api.cwmarketfoundation.org`). The RDS instance is in a private subnet (not publicly accessible). The frontend is hosted on Firebase Hosting at `app.cwmarketfoundation.org`.

**Key identifiers:**

| Resource | Value |
|----------|-------|
| AWS Account ID | 493467536778 |
| Region | us-east-1 |
| EC2 Instance ID | i-0475ff86fd8ff4cce |
| Elastic IP | 32.194.5.150 |
| RDS Endpoint | cwddatabasestack-cwddatabase3683b2b2-fmh2229jy9lp.c6duoccyixq5.us-east-1.rds.amazonaws.com |
| RDS Database Name | cwd_db |
| RDS User | cwd_admin |
| Key Pair ID | key-0ddd42df0b9361eab |
| GitHub Actions Role ARN | arn:aws:iam::493467536778:role/github-actions-cwd-deploy |

## 2. How Deployments Work

We deploy automatically on every push to `main`.

1. Push to `main` triggers `.github/workflows/deploy.yml`
2. GitHub Actions SSHes into our EC2 instance using `appleboy/ssh-action`
3. On EC2, the workflow runs:
   - `git pull`
   - `npm ci --omit=dev`
   - `./scripts/fetch-secrets.sh`
   - `pm2 restart cwd-backend`
   - Health check

**GitHub secrets required** (already configured in the repo `zjovy/cwd-backend`):

- `EC2_HOST` — the Elastic IP
- `EC2_USERNAME` — `ec2-user`
- `EC2_SSH_KEY` — the private key contents

## 3. Common Operations

### SSH into the server

```
ssh -i cwd-backend-key.pem ec2-user@32.194.5.150
```

If you need to re-download the key file:

```
aws ssm get-parameter --name /ec2/keypair/key-0ddd42df0b9361eab --with-decryption --query 'Parameter.Value' --output text > cwd-backend-key.pem && chmod 400 cwd-backend-key.pem
```

### View app logs

```
pm2 logs cwd-backend --lines 50
```

### Restart the app

```
pm2 restart cwd-backend
```

### Check app status

```
pm2 status
```

### Connect to the database

```
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id cwd/db-credentials --region us-east-1 --query SecretString --output text)
mysql -h $(echo $DB_SECRET | jq -r '.host') -u $(echo $DB_SECRET | jq -r '.username') -p$(echo $DB_SECRET | jq -r '.password') cwd_db
```

### Refresh environment variables

```
./scripts/fetch-secrets.sh
pm2 restart cwd-backend
```

### Make a user an admin

New users who sign in get a default (non-admin) role. To grant admin access, we need to update their role in the database.

**Option A: From the CLI (requires AWS CLI + SSH key)**

```bash
# SSH into EC2
ssh -i cwd-backend-key.pem ec2-user@32.194.5.150

# Connect to the database
DB_SECRET=$(aws secretsmanager get-secret-value --secret-id cwd/db-credentials --region us-east-1 --query SecretString --output text)
mysql -h $(echo $DB_SECRET | jq -r '.host') -u $(echo $DB_SECRET | jq -r '.username') -p$(echo $DB_SECRET | jq -r '.password') cwd_db

# Then run:
UPDATE users SET role = 'admin' WHERE email = 'their-email@example.com';
```

**Option B: From the AWS Console (no CLI needed)**

1. Go to [AWS Console](https://console.aws.amazon.com) → **EC2** → **Instances** → select our instance (`i-0475ff86fd8ff4cce`)
2. Click **Connect** → **Session Manager** → **Connect** (this opens a terminal in the browser, no SSH key needed)
3. Run:
   ```bash
   sudo -u ec2-user bash
   cd /home/ec2-user/cwd-backend
   DB_SECRET=$(aws secretsmanager get-secret-value --secret-id cwd/db-credentials --region us-east-1 --query SecretString --output text)
   mysql -h $(echo $DB_SECRET | jq -r '.host') -u $(echo $DB_SECRET | jq -r '.username') -p$(echo $DB_SECRET | jq -r '.password') cwd_db
   ```
4. Then run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'their-email@example.com';
   ```

**To verify it worked:**

```sql
SELECT email, role FROM users;
```

### Update Resend API key

```
aws secretsmanager update-secret --secret-id cwd/resend-key --secret-string "re_new_key_here" --region us-east-1
```

Then on EC2:

```
./scripts/fetch-secrets.sh && pm2 restart cwd-backend --update-env
```

### Update Firebase credentials

```
aws secretsmanager update-secret --secret-id cwd/firebase-key --secret-string file://new-firebase-key.json --region us-east-1
```

Then on EC2:

```
./scripts/fetch-secrets.sh && pm2 restart cwd-backend
```

## 4. Infrastructure Management (CDK)

Our infrastructure is defined as code using AWS CDK. The CDK project lives in `infra/`.

All infra changes should be made in CDK code, then deployed:

```
cd infra
npx cdk deploy <StackName>
```

To preview what would change before deploying:

```
npx cdk diff <StackName>
```

**Our stacks (deployment order matters):**

1. `CwdNetworkStack` — VPC, subnets, security groups
2. `CwdDatabaseStack` — RDS instance, credentials secret
3. `CwdComputeStack` — EC2 instance, Elastic IP, IAM roles
4. `CwdCicdStack` — GitHub Actions OIDC role

Never delete `CwdDatabaseStack` without backing up the database first. RDS has deletion protection enabled, but be careful.

## 5. Cost

Estimated ~$27/mo (or ~$4/mo if we are still in the AWS free tier).

| Resource | Cost |
|----------|------|
| EC2 t3.micro | ~$8/mo |
| RDS db.t3.micro | ~$15/mo |
| Elastic IP (while attached to running instance) | free |
| Data transfer | ~$2/mo |
| Secrets Manager | ~$1/mo |

## 6. Troubleshooting

**App not responding:** Check `pm2 logs cwd-backend`, then restart with `pm2 restart cwd-backend`.

**502 Bad Gateway:** The app crashed. Check logs, fix the issue, restart.

**Can't SSH:** Check the security group in the AWS console (should allow port 22 from your IP). Verify key file permissions are `chmod 400`.

**DB connection refused:** Check the security group allows port 3306 from within the VPC. Verify `.env` has the correct `DB_HOST`.

**Secrets fetch fails:** Check the EC2 IAM role has `secretsmanager:GetSecretValue` permissions. Verify you are targeting `us-east-1`.

## 7. Domain & SSL Setup

**Domain:** `cwmarketfoundation.org` (managed in Squarespace DNS)

**DNS Records:**

| Type | Host | Value |
|------|------|-------|
| A | api | 32.194.5.150 |
| CNAME | app | cwd-donor-management.web.app |

**Backend (api.cwmarketfoundation.org):**

1. SSH into EC2
2. Update Nginx config — change `server_name _` to `server_name api.cwmarketfoundation.org`:
   ```
   sudo nano /etc/nginx/conf.d/cwd-backend.conf
   ```
3. Run Certbot for HTTPS:
   ```
   sudo certbot --nginx -d api.cwmarketfoundation.org
   ```
4. Refresh secrets and restart:
   ```
   ./scripts/fetch-secrets.sh && pm2 restart cwd-backend
   ```

**Frontend (app.cwmarketfoundation.org):**

Hosted on Firebase Hosting (project: `cwd-donor-management`). Custom domain is configured in Firebase Console → Hosting → Custom domains.

Frontend deploys automatically via GitHub Actions on push to `main` in the frontend repo.

## 8. Secrets in AWS Secrets Manager

These secrets are stored in AWS Secrets Manager and pulled by `scripts/fetch-secrets.sh` during each deploy:

| Secret ID | Contents |
|-----------|----------|
| `cwd/db-credentials` | DB host, port, dbname, username, password (auto-generated by CDK) |
| `cwd/firebase-key` | Firebase service account JSON |
| `cwd/resend-key` | Resend API key for sending receipt emails |

The following values are hardcoded in `fetch-secrets.sh` (not secrets):

- `RESEND_FROM_EMAIL` — `C&W Market Foundation <info@cwmarketfoundation.org>`
- `RECEIPT_CC_EMAIL` — `info@cwmarketfoundation.org`
- `FRONTEND_URL` — `https://app.cwmarketfoundation.org`
- `API_URL` — `https://api.cwmarketfoundation.org`

## 9. Initial Setup From Scratch

If you ever need to set up the infrastructure from scratch (new AWS account, etc.):

### 1. Deploy CDK stacks

```bash
cd infra
npm ci
npx cdk deploy CwdNetworkStack
npx cdk deploy CwdDatabaseStack
npx cdk deploy CwdComputeStack
npx cdk deploy CwdCicdStack
```

Stacks must be deployed in this order due to cross-stack dependencies.

### 2. Populate secrets

Upload the Firebase service account key:

```bash
aws secretsmanager update-secret --secret-id cwd/firebase-key --secret-string file://firebase-service-account.json --region us-east-1
```

Create the Resend API key secret:

```bash
aws secretsmanager create-secret --name cwd/resend-key --secret-string "re_your_key_here" --region us-east-1
```

DB credentials are auto-generated by CDK — no manual step needed.

### 3. Configure GitHub Actions

In the GitHub repo settings (Settings → Secrets and variables → Actions), add:

- `EC2_HOST` — the Elastic IP from CDK output
- `EC2_USERNAME` — `ec2-user`
- `EC2_SSH_KEY` — download from SSM:
  ```bash
  aws ssm get-parameter --name /ec2/keypair/<key-pair-id> --with-decryption --query 'Parameter.Value' --output text
  ```

### 4. Configure DNS

Add these records in your DNS provider (Squarespace for cwmarketfoundation.org):

| Type | Host | Value |
|------|------|-------|
| A | api | `<Elastic IP>` |
| CNAME | app | `<firebase-project>.web.app` |

For the `app` subdomain, also add the custom domain in Firebase Console → Hosting → Custom domains.

### 5. Set up SSL on EC2

SSH into EC2 and run:

```bash
sudo sed -i 's/server_name _;/server_name api.cwmarketfoundation.org;/' /etc/nginx/conf.d/cwd-backend.conf
sudo certbot --nginx -d api.cwmarketfoundation.org
sudo systemctl restart nginx
```

### 6. Deploy and verify

Push to `main` to trigger the deploy workflow, or manually on EC2:

```bash
cd ~/cwd-backend
git pull origin main
npm ci --omit=dev
./scripts/fetch-secrets.sh
pm2 restart cwd-backend --update-env
curl http://localhost:5050/health
```

### 7. Promote an admin user

After a user signs in for the first time, promote them to admin (see "Make a user an admin" in section 3).
