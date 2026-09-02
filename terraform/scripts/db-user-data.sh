#!/bin/bash
set -e

# Log script execution
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "[INFO] Starting Safe-Circle PostgreSQL Database Server initialization..."

# 1. Configure Swap Space (${swap_size_gb}GB) to prevent OOM on t3.micro (1GB RAM)
SWAP_SIZE_GB=${swap_size_gb}
if [ ! -f /swapfile ]; then
    echo "[INFO] Allocating $${SWAP_SIZE_GB}GB swap file..."
    fallocate -l "$${SWAP_SIZE_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024))
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
    echo "[INFO] Swap configured successfully."
fi

# 2. Update system and install prerequisite packages
echo "[INFO] Updating apt repositories..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release git ufw htop jq

# 3. Install Docker and Docker Compose Plugin
echo "[INFO] Installing Docker Engine & Docker Compose..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# 4. Create database directory and persistent storage
echo "[INFO] Setting up PostgreSQL storage and compose files..."
mkdir -p /opt/safe-circle-db
mkdir -p /opt/safe-circle-db/data
chown -R ubuntu:ubuntu /opt/safe-circle-db

cat << 'EOF' > /opt/safe-circle-db/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: safe_circle_postgres
    restart: always
    environment:
      POSTGRES_DB: ${db_name}
      POSTGRES_USER: ${db_user}
      POSTGRES_PASSWORD: ${db_password}
    ports:
      - "${db_port}:5432"
    volumes:
      - /opt/safe-circle-db/data:/var/lib/postgresql/data
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=768MB
      -c work_mem=16MB
      -c maintenance_work_mem=64MB
      -c max_connections=100
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${db_user} -d ${db_name}"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF

# 5. Launch PostgreSQL Container via Docker Compose
echo "[INFO] Launching PostgreSQL service..."
cd /opt/safe-circle-db
docker compose up -d

# 6. Configure Firewall (UFW)
echo "[INFO] Configuring database firewall rules..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
# Allow port 5432 from within the VPC subnet
ufw allow from ${vpc_cidr} to any port ${db_port} proto tcp comment 'PostgreSQL from VPC'
ufw --force enable

echo "[INFO] Safe-Circle PostgreSQL Server setup completed successfully!"
