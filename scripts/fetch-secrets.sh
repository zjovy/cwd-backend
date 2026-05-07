#!/bin/bash
set -e

# fetch-secrets.sh — Pulls secrets from AWS Secrets Manager and writes .env
# Run on EC2 during deploys or manually to refresh secrets.

ENV_FILE="/home/ec2-user/cwd-backend/.env"
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
REGION=${REGION:-us-east-1}

echo "Fetching secrets from Secrets Manager (region: $REGION)..."

# Static config
cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=5050
DATABASE_CLIENT=mysql
EOF

# These should be set per-deployment (update before first deploy)
echo "FRONTEND_URL=${FRONTEND_URL:-https://cwd-frontend.vercel.app}" >> "$ENV_FILE"
echo "API_URL=${API_URL:-http://32.194.5.150}" >> "$ENV_FILE"

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
