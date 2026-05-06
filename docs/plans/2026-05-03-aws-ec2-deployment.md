# AWS EC2 Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy cwd-backend to AWS using EC2 + RDS MySQL + Nginx + PM2, with automated CI/CD via GitHub Actions, all defined in AWS CDK (TypeScript).

**Architecture:** Single EC2 instance (t3.micro) in a public subnet running Nginx as reverse proxy + PM2 managing the Node.js app. RDS MySQL in a private subnet. Secrets stored in AWS Secrets Manager. GitHub Actions deploys via SSH on push to main.

**Tech Stack:** AWS CDK (TypeScript), EC2, RDS MySQL, Nginx, PM2, Let's Encrypt/Certbot, GitHub Actions, Secrets Manager

**Spec:** `docs/specs/aws-deployment-design.md`

---

## File Structure

```
cwd-backend/
├── infra/                          # AWS CDK project (TypeScript)
│   ├── bin/
│   │   └── infra.ts               # CDK app entry — instantiates all stacks
│   ├── lib/
│   │   ├── network-stack.ts       # VPC, subnets (public + private)
│   │   ├── database-stack.ts      # RDS MySQL, security group, DB credentials secret
│   │   ├── compute-stack.ts       # EC2, Elastic IP, security group, IAM role, Firebase secret
│   │   └── cicd-stack.ts          # GitHub OIDC provider + IAM role for Actions
│   ├── scripts/
│   │   └── user-data.sh           # EC2 bootstrap script (Node, Nginx, PM2, Certbot)
│   ├── cdk.json                   # CDK app config
│   ├── tsconfig.json              # TypeScript config
│   └── package.json               # CDK dependencies
├── scripts/
│   └── fetch-secrets.sh           # Pulls secrets from Secrets Manager → .env
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions deploy pipeline
└── ecosystem.config.cjs           # PM2 config file
```

---

## Task 1: Initialize CDK Project

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`
- Create: `infra/bin/infra.ts`

- [ ] **Step 1: Create the infra directory and initialize CDK**

```bash
cd cwd-backend
mkdir -p infra
cd infra
npx cdk init app --language typescript
```

This scaffolds the CDK project. We'll overwrite the generated files next.

- [ ] **Step 2: Install required CDK packages**

```bash
cd infra
npm install aws-cdk-lib constructs
```

- [ ] **Step 3: Configure `cdk.json`**

Replace the generated `infra/cdk.json` with:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/infra.ts",
  "watch": {
    "include": ["**"],
    "exclude": ["node_modules", "cdk.out"]
  },
  "context": {
    "domainName": "api.yourapp.com",
    "sshAllowedIps": ["0.0.0.0/0"],
    "githubOrg": "YOUR_ORG",
    "githubRepo": "cwd-backend",
    "region": "us-east-1"
  }
}
```

> Note: Replace `domainName`, `githubOrg`, `githubRepo`, and `sshAllowedIps` with real values before deploying. `sshAllowedIps` should be restricted to team IPs in production.

- [ ] **Step 4: Write the CDK app entry point**

Create `infra/bin/infra.ts`:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('region') || 'us-east-1',
};

const networkStack = new NetworkStack(app, 'CwdNetworkStack', { env });

const databaseStack = new DatabaseStack(app, 'CwdDatabaseStack', {
  env,
  vpc: networkStack.vpc,
});

const computeStack = new ComputeStack(app, 'CwdComputeStack', {
  env,
  vpc: networkStack.vpc,
  dbSecurityGroup: databaseStack.dbSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  rdsEndpoint: databaseStack.rdsEndpoint,
});

new CicdStack(app, 'CwdCicdStack', { env });
```

- [ ] **Step 5: Verify CDK project compiles**

```bash
cd infra
npx tsc --noEmit
```

Expected: No errors (will show errors for missing stack files — that's fine, we'll create them in the next tasks).

- [ ] **Step 6: Commit**

```bash
git add infra/
git commit -m "feat: initialize AWS CDK project for infrastructure"
```

---

## Task 2: Network Stack (VPC + Subnets)

**Files:**
- Create: `infra/lib/network-stack.ts`

- [ ] **Step 1: Write the network stack**

Create `infra/lib/network-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'CwdVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd infra && npx tsc --noEmit
```

Expected: No errors for this file (other files may error — that's fine).

- [ ] **Step 3: Commit**

```bash
git add infra/lib/network-stack.ts
git commit -m "feat: add network stack (VPC + public/private subnets)"
```

---

## Task 3: Database Stack (RDS MySQL + Secrets)

**Files:**
- Create: `infra/lib/database-stack.ts`

- [ ] **Step 1: Write the database stack**

Create `infra/lib/database-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly rdsEndpoint: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RDS MySQL',
      allowAllOutbound: false,
    });

    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      secretName: 'cwd/db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'cwd_admin',
          dbname: 'cwd_db',
          port: '3306',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.dbSecret = dbCredentials;

    const dbInstance = new rds.DatabaseInstance(this, 'CwdDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(dbCredentials),
      databaseName: 'cwd_db',
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      publiclyAccessible: false,
      storageEncrypted: true,
    });

    this.rdsEndpoint = dbInstance.dbInstanceEndpointAddress;

    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbCredentials.secretArn,
    });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd infra && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add infra/lib/database-stack.ts
git commit -m "feat: add database stack (RDS MySQL + Secrets Manager)"
```

---

## Task 4: Compute Stack (EC2 + Elastic IP + IAM)

**Files:**
- Create: `infra/lib/compute-stack.ts`
- Create: `infra/scripts/user-data.sh`

- [ ] **Step 1: Write the EC2 user data bootstrap script**

Create `infra/scripts/user-data.sh`:

```bash
#!/bin/bash
set -e

# Log output to /var/log/user-data.log
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== Starting CWD Backend Setup ==="

# Install Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Install Nginx
yum install -y nginx

# Install git, jq (for parsing secrets)
yum install -y git jq

# Install PM2 globally
npm install -g pm2

# Install Certbot for SSL
yum install -y certbot python3-certbot-nginx

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Clone the repo (will be replaced by CI/CD later)
cd /home/ec2-user
git clone https://github.com/${GITHUB_ORG}/${GITHUB_REPO}.git cwd-backend || true
cd cwd-backend
npm ci --omit=dev

# Create scripts directory and fetch-secrets script
mkdir -p scripts
cat > scripts/fetch-secrets.sh << 'SCRIPT'
#!/bin/bash
set -e

ENV_FILE="/home/ec2-user/cwd-backend/.env"
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Static config
cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=5050
DATABASE_CLIENT=mysql
FRONTEND_URL=${FRONTEND_URL}
API_URL=https://${DOMAIN_NAME}
EOF

# DB credentials from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id cwd/db-credentials \
  --region "$REGION" \
  --query 'SecretString' --output text)

echo "DB_HOST=$(echo $DB_SECRET | jq -r '.host')" >> "$ENV_FILE"
echo "DB_PORT=$(echo $DB_SECRET | jq -r '.port')" >> "$ENV_FILE"
echo "db_name=$(echo $DB_SECRET | jq -r '.dbname')" >> "$ENV_FILE"
echo "dev_user=$(echo $DB_SECRET | jq -r '.username')" >> "$ENV_FILE"
echo "dev_password=$(echo $DB_SECRET | jq -r '.password')" >> "$ENV_FILE"

# Firebase key from Secrets Manager
FIREBASE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id cwd/firebase-key \
  --region "$REGION" \
  --query 'SecretString' --output text)
echo "FIREBASE_SERVICE_ACCOUNT_KEY='$FIREBASE_KEY'" >> "$ENV_FILE"

chmod 600 "$ENV_FILE"
chown ec2-user:ec2-user "$ENV_FILE"
SCRIPT
chmod +x scripts/fetch-secrets.sh

# Fetch secrets (will fail if secrets not yet populated — that's OK on first boot)
./scripts/fetch-secrets.sh || echo "Secrets not yet available — run fetch-secrets.sh after populating Secrets Manager"

# Set up PM2 as ec2-user
sudo -u ec2-user bash -c '
  cd /home/ec2-user/cwd-backend
  pm2 start src/server.js --name cwd-backend
  pm2 startup systemd -u ec2-user --hp /home/ec2-user
  pm2 save
'

# Configure Nginx (basic reverse proxy — SSL added later via Certbot)
cat > /etc/nginx/conf.d/cwd-backend.conf << 'NGINX'
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Remove default Nginx config
rm -f /etc/nginx/conf.d/default.conf

# Restart Nginx
systemctl restart nginx

echo "=== CWD Backend Setup Complete ==="
```

- [ ] **Step 2: Write the compute stack**

Create `infra/lib/compute-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
  dbSecret: secretsmanager.ISecret;
  rdsEndpoint: string;
}

export class ComputeStack extends cdk.Stack {
  public readonly instance: ec2.Instance;
  public readonly elasticIp: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { vpc, dbSecurityGroup, dbSecret, rdsEndpoint } = props;
    const domainName = this.node.tryGetContext('domainName');
    const sshAllowedIps: string[] = this.node.tryGetContext('sshAllowedIps') || ['0.0.0.0/0'];
    const githubOrg = this.node.tryGetContext('githubOrg');
    const githubRepo = this.node.tryGetContext('githubRepo');

    // Security group for EC2
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'Ec2SecurityGroup', {
      vpc,
      description: 'Security group for CWD backend EC2',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS from anywhere
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

    // Allow SSH from specified IPs
    for (const ip of sshAllowedIps) {
      ec2SecurityGroup.addIngressRule(ec2.Peer.ipv4(ip), ec2.Port.tcp(22), 'SSH');
    }

    // Allow EC2 to connect to RDS
    dbSecurityGroup.addIngressRule(ec2SecurityGroup, ec2.Port.tcp(3306), 'EC2 to RDS');

    // IAM role for EC2 (Secrets Manager access + SSM)
    const ec2Role = new iam.Role(this, 'Ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant read access to secrets
    dbSecret.grantRead(ec2Role);

    // Also grant access to firebase secret (created manually or via console)
    ec2Role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:cwd/firebase-key*`,
        ],
      }),
    );

    // Key pair for SSH
    const keyPair = new ec2.KeyPair(this, 'Ec2KeyPair', {
      keyPairName: 'cwd-backend-key',
    });

    // Read and prepare user data script
    let userData = readFileSync(join(__dirname, '../scripts/user-data.sh'), 'utf8');
    userData = userData.replace(/\$\{DOMAIN_NAME\}/g, domainName);
    userData = userData.replace(/\$\{GITHUB_ORG\}/g, githubOrg);
    userData = userData.replace(/\$\{GITHUB_REPO\}/g, githubRepo);
    userData = userData.replace(/\$\{FRONTEND_URL\}/g, 'https://yourapp.com'); // Update this

    // EC2 instance
    this.instance = new ec2.Instance(this, 'CwdBackend', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      keyPair,
      userData: ec2.UserData.custom(userData),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Elastic IP
    this.elasticIp = new ec2.CfnEIP(this, 'ElasticIp');
    new ec2.CfnEIPAssociation(this, 'EipAssociation', {
      eip: this.elasticIp.ref,
      instanceId: this.instance.instanceId,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ElasticIpAddress', {
      value: this.elasticIp.attrPublicIp,
      description: 'Add this as an A record in Squarespace DNS for api.yourapp.com',
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
    });

    new cdk.CfnOutput(this, 'SshCommand', {
      value: `ssh -i cwd-backend-key.pem ec2-user@${this.elasticIp.attrPublicIp}`,
    });

    new cdk.CfnOutput(this, 'KeyPairId', {
      value: keyPair.keyPairId,
      description: 'Retrieve private key: aws ssm get-parameter --name /ec2/keypair/<id> --with-decryption',
    });
  }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd infra && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add infra/lib/compute-stack.ts infra/scripts/user-data.sh
git commit -m "feat: add compute stack (EC2 + Elastic IP + IAM + user data)"
```

---

## Task 5: CI/CD Stack (GitHub OIDC)

**Files:**
- Create: `infra/lib/cicd-stack.ts`

- [ ] **Step 1: Write the CI/CD stack**

Create `infra/lib/cicd-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOrg = this.node.tryGetContext('githubOrg');
    const githubRepo = this.node.tryGetContext('githubRepo');

    // GitHub OIDC Provider (one per AWS account)
    const githubProvider = new iam.OpenIdConnectProvider(this, 'GithubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // IAM Role that GitHub Actions assumes
    const deployRole = new iam.Role(this, 'GithubActionsDeployRole', {
      roleName: 'github-actions-cwd-deploy',
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:ref:refs/heads/main`,
          },
        },
      ),
    });

    // Minimal permissions: only what GitHub Actions needs for SSH deploy
    // (The actual deploy is done via SSH, so we mainly need Secrets Manager access
    //  in case we want to refresh secrets from CI)
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:cwd/*`,
        ],
      }),
    );

    new cdk.CfnOutput(this, 'GithubActionsRoleArn', {
      value: deployRole.roleArn,
      description: 'Add this as AWS_OIDC_ROLE_ARN GitHub secret',
    });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd infra && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add infra/lib/cicd-stack.ts
git commit -m "feat: add CI/CD stack (GitHub OIDC + deploy IAM role)"
```

---

## Task 6: Fetch Secrets Script

**Files:**
- Create: `scripts/fetch-secrets.sh`

- [ ] **Step 1: Create the fetch-secrets script in the app repo root**

Create `scripts/fetch-secrets.sh`:

```bash
#!/bin/bash
set -e

# fetch-secrets.sh — Pulls secrets from AWS Secrets Manager and writes .env
# Run on EC2 during deploys or manually to refresh secrets.

ENV_FILE="/home/ec2-user/cwd-backend/.env"
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

echo "Fetching secrets from Secrets Manager (region: $REGION)..."

# Static config
cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=5050
DATABASE_CLIENT=mysql
EOF

# These should be set per-deployment (update before first deploy)
echo "FRONTEND_URL=${FRONTEND_URL:-https://yourapp.com}" >> "$ENV_FILE"
echo "API_URL=${API_URL:-https://api.yourapp.com}" >> "$ENV_FILE"

# DB credentials from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id cwd/db-credentials \
  --region "$REGION" \
  --query 'SecretString' --output text)

echo "DB_HOST=$(echo "$DB_SECRET" | jq -r '.host')" >> "$ENV_FILE"
echo "DB_PORT=$(echo "$DB_SECRET" | jq -r '.port')" >> "$ENV_FILE"
echo "db_name=$(echo "$DB_SECRET" | jq -r '.dbname')" >> "$ENV_FILE"
echo "dev_user=$(echo "$DB_SECRET" | jq -r '.username')" >> "$ENV_FILE"
echo "dev_password=$(echo "$DB_SECRET" | jq -r '.password')" >> "$ENV_FILE"

# Firebase key from Secrets Manager
FIREBASE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id cwd/firebase-key \
  --region "$REGION" \
  --query 'SecretString' --output text)
echo "FIREBASE_SERVICE_ACCOUNT_KEY='$FIREBASE_KEY'" >> "$ENV_FILE"

chmod 600 "$ENV_FILE"
echo "Secrets written to $ENV_FILE"
```

- [ ] **Step 2: Make it executable and commit**

```bash
chmod +x scripts/fetch-secrets.sh
git add scripts/fetch-secrets.sh
git commit -m "feat: add fetch-secrets.sh for Secrets Manager → .env"
```

---

## Task 7: PM2 Ecosystem Config

**Files:**
- Create: `ecosystem.config.cjs`

- [ ] **Step 1: Create PM2 config**

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'cwd-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add ecosystem.config.cjs
git commit -m "feat: add PM2 ecosystem config"
```

---

## Task 8: GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow directory and file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ec2-user/cwd-backend

            # Pull latest code
            git pull origin main

            # Install production dependencies
            npm ci --omit=dev

            # Refresh secrets from Secrets Manager
            ./scripts/fetch-secrets.sh

            # Restart the app
            pm2 restart cwd-backend || pm2 start ecosystem.config.cjs

            # Health check
            sleep 3
            curl -f http://localhost:5050/health || exit 1

            echo "Deploy successful!"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deploy workflow (SSH to EC2)"
```

---

## Task 9: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add infra-related entries to .gitignore**

Append to the existing `.gitignore`:

```
# CDK
infra/cdk.out/
infra/node_modules/

# SSH keys
*.pem
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add CDK and SSH key entries to .gitignore"
```

---

## Task 10: Verify Full CDK Synthesis

**Files:** None (verification only)

- [ ] **Step 1: Synthesize all stacks**

```bash
cd infra
npx cdk synth --all
```

Expected: CloudFormation templates generated in `infra/cdk.out/` with no errors. This validates all stacks compile and produce valid CloudFormation.

- [ ] **Step 2: Run CDK diff (preview what would be deployed)**

```bash
npx cdk diff --all
```

Expected: Shows all resources that would be created (everything is new since we haven't deployed yet).

- [ ] **Step 3: Commit the verified state**

```bash
git add -A
git commit -m "chore: verify CDK synthesis passes for all stacks"
```

---

## Post-Implementation: First Deploy Checklist

After the code is merged, follow these steps to actually deploy to AWS (not automated — requires AWS account access):

1. **Bootstrap CDK**: `cd infra && npx cdk bootstrap aws://ACCOUNT_ID/us-east-1`
2. **Deploy network**: `npx cdk deploy CwdNetworkStack`
3. **Deploy database**: `npx cdk deploy CwdDatabaseStack`
4. **Create Firebase secret manually**:
   ```bash
   aws secretsmanager create-secret \
     --name cwd/firebase-key \
     --secret-string file://path-to-firebase-service-account.json
   ```
5. **Deploy compute**: `npx cdk deploy CwdComputeStack`
6. **Note the Elastic IP** from the stack output
7. **Add DNS record** in Squarespace: A record, Host = `api`, Data = Elastic IP
8. **SSH in and set up SSL**:
   ```bash
   ssh -i key.pem ec2-user@<elastic-ip>
   sudo certbot --nginx -d api.yourapp.com --non-interactive --agree-tos -m our-email@example.com
   ```
9. **Run database schema**:
   ```bash
   mysql -h <rds-endpoint> -u cwd_admin -p < sql/create_tables_mysql.sql
   ```
10. **Deploy CI/CD stack**: `npx cdk deploy CwdCicdStack`
11. **Configure GitHub secrets**: `EC2_HOST`, `EC2_SSH_KEY`, `EC2_USERNAME`
12. **Verify**: `curl https://api.yourapp.com/health`
