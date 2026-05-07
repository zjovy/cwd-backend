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
