#!/bin/bash
set -e

# Log script execution
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "[INFO] Starting Safe-Circle App Server initialization..."

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
apt-get install -y ca-certificates curl gnupg lsb-release git ufw htop jq unzip

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

# Add 'ubuntu' user to docker group
usermod -aG docker ubuntu

# 4. Prepare application directories
echo "[INFO] Creating application directories..."
mkdir -p /opt/safe-circle
mkdir -p /opt/safe-circle/uploads
chown -R ubuntu:ubuntu /opt/safe-circle

# 5. Configure Firewall (UFW)
echo "[INFO] Configuring firewall rules..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow ${app_port}/tcp comment 'Safe-Circle Backend Port'
ufw --force enable

echo "[INFO] Safe-Circle App Server setup completed successfully!"
