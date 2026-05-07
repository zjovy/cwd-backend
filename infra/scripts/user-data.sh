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

# Install git, jq, mariadb client (for parsing secrets and DB access)
yum install -y git jq mariadb105

# Install PM2 globally
npm install -g pm2

# Install Certbot for SSL
yum install -y certbot python3-certbot-nginx

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx

# Clone the repo as ec2-user
sudo -u ec2-user bash -c '
  cd /home/ec2-user
  git clone https://github.com/${GITHUB_ORG}/${GITHUB_REPO}.git cwd-backend || true
  cd cwd-backend
  npm ci --omit=dev
'

# Make fetch-secrets.sh executable (it comes from the repo)
chmod +x /home/ec2-user/cwd-backend/scripts/fetch-secrets.sh

# Fetch secrets (will fail if secrets not yet populated — that's OK on first boot)
sudo -u ec2-user bash -c '
  cd /home/ec2-user/cwd-backend
  ./scripts/fetch-secrets.sh
' || echo "Secrets not yet available — run fetch-secrets.sh after populating Secrets Manager"

# Set up PM2 as ec2-user
sudo -u ec2-user bash -c '
  cd /home/ec2-user/cwd-backend
  pm2 start ecosystem.config.cjs
  pm2 startup systemd -u ec2-user --hp /home/ec2-user
  pm2 save
'

# Configure Nginx (basic reverse proxy — SSL added later via Certbot)
cat > /etc/nginx/conf.d/cwd-backend.conf << 'NGINX'
server {
    listen 80;
    server_name _;

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
