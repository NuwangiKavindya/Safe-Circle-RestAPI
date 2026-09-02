# Safe-Circle AWS EC2 Deployment & CI/CD Guide

This guide provides step-by-step instructions for provisioning the infrastructure on **AWS EC2 (t3.micro)** using **Terraform** and setting up automated CI/CD deployments using **GitHub Actions**.

---

## 🏗️ Architecture Overview

To ensure optimal performance and avoid memory exhaustion on `t3.micro` instances (which have 1GB RAM), the architecture separates the workload across two dedicated instances:

1. **App Server EC2 (`t3.micro`)**:
   - **Role**: Runs Node.js Express API, Socket.IO WebSocket server, and Nginx reverse proxy.
   - **Memory**: 1GB RAM + **2GB Swap space** (configured automatically).
   - **Networking**: Elastic IP (Static Public IP), Ports `22` (SSH), `80` (HTTP), `443` (HTTPS), `5001` (App Direct).
2. **Database Server EC2 (`t3.micro`)**:
   - **Role**: Runs PostgreSQL 16 database with persistent storage.
   - **Memory**: 1GB RAM + **2GB Swap space** (configured automatically).
   - **Networking**: Private to the VPC. Port `5432` is only accessible by the App Server.

```
                          +-------------------------------------------------------------+
                          |                          AWS Cloud                          |
                          |                                                             |
                          |   +-----------------------------------------------------+   |
                          |   |                     VPC (10.0.0.0/16)               |   |
                          |   |                                                     |   |
                          |   |   +-----------------------+                         |   |
 Internet                 |   |   |  Public Subnet        |                         |   |
 (Users / GitHub) ------->|-->|---|  App EC2 (t3.micro)   |                         |   |
                          |   |   |  Elastic IP (Static)  |                         |   |
                          |   |   |  - Node.js API (5001) |    Internal VPC (5432)  |   |
                          |   |   |  - Nginx Reverse Proxy|--------------------+    |   |
                          |   |   |  - 2GB Swap Memory    |                    |    |   |
                          |   |   +-----------------------+                    |    |   |
                          |   |                                                v    |   |
                          |   |   +-------------------------------------------------+   |
                          |   |   |  Database Subnet                                |   |
                          |   |   |  DB EC2 (t3.micro)                              |   |
                          |   |   |  - PostgreSQL 16 (Port 5432)                    |   |
                          |   |   |  - Persistent Disk Storage                      |   |
                          |   |   |  - 2GB Swap Memory                              |   |
                          |   |   +-------------------------------------------------+   |
                          |   +-----------------------------------------------------+   |
                          +-------------------------------------------------------------+
```

---

## 📋 Prerequisites

1. **AWS Account & CLI**: Configured AWS credentials (`aws configure`) with administrative permissions for VPC, EC2, and Security Groups.
2. **Terraform**: Version `>= 1.5.0` installed on your machine.
3. **SSH Key Pair**: An SSH key pair to access the EC2 instances.

---

## 🚀 Part 1: Provision Infrastructure with Terraform

### 1. Generate SSH Key Pair (if you don't already have one)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/safe-circle-key -C "deployer@safecircle"
```

### 2. Configure Terraform Variables
Navigate to the `terraform/` directory:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region                  = "ap-south-1"       # Choose your preferred AWS region
environment                 = "production"
project_name                = "safe-circle"
instance_type               = "t3.micro"
create_separate_db_instance = true               # Provisions 2 separate t3.micro instances
public_key                  = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... deployer@safecircle" # Paste contents of ~/.ssh/safe-circle-key.pub
allowed_ssh_cidr            = ["0.0.0.0/0"]      # Or lock down to your IP, e.g. ["x.x.x.x/32"]
app_port                    = 5001
db_name                     = "safe_circle"
db_user                     = "safe_circle_user"
volume_size                 = 20
swap_size_gb                = 2
```

### 3. Initialize and Apply Terraform
```bash
# Initialize providers and modules
terraform init

# Review execution plan
terraform plan

# Apply changes to provision resources
terraform apply
```

### 4. Capture Terraform Outputs
After successful application, Terraform will output:
- `app_elastic_ip`: (e.g., `13.234.120.45`)
- `db_private_ip`: (e.g., `10.0.2.84`)
- `db_password`: To view the generated database password, run:
  ```bash
  terraform output -raw db_password
  ```

---

## 🔑 Part 2: Configure GitHub Actions CI/CD Variables

In your GitHub repository, go to **Settings** ➔ **Secrets and variables** ➔ **Actions**.

### 1. Required Repository Secrets (Only 5 Secrets Needed!)
Navigate to **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ **New repository secret**:

| Secret Name | Value to Enter | Source / Description |
|---|---|---|
| **`EC2_HOST`** | `35.154.31.80` | Public Elastic IP of App Server |
| **`EC2_SSH_KEY`** | *(Paste content of `~/.ssh/safe-circle-key`)* | Private SSH key |
| **`DB_HOST`** | `10.0.2.16` | Private internal IP of DB Server |
| **`DB_PASSWORD`** | `CTT6lIkJ81ducwxzvhTv` | Database password |
| **`JWT_SECRET`** | `209fd6ed0d7e0ad73c59ede5b480bb688bc87e90a249fd6db1450f9ea934fd90` | JWT signing secret |

*(Optional secrets if using Google SSO or email: `GOOGLE_CLIENT_ID`, `SMTP_USER`, `SMTP_PASS`)*

### 2. Repository Variables
> **None required!** All standard configuration variables (`PORT=5001`, `NODE_ENV=production`, `DB_NAME=safe_circle`, `DB_PORT=5432`, `DB_USER=safe_circle_user`, `JWT_EXPIRE_DAYS=30`) are built directly into the CI/CD pipeline.

---

## 🔄 Part 3: Deploy via GitHub Actions

### Automatic Deployment
Whenever you push code changes to the `main` branch affecting `backend/`, `docker-compose.yml`, or `nginx/`, the pipeline will automatically:
1. Validate backend code and syntax.
2. Connect securely to the EC2 instance via SSH.
3. Pull the latest code and inject `.env` configurations from secrets.
4. Build and start Docker containers via `docker compose`.
5. Prune dangling layers and run health verification.

### Manual Deployment
1. Go to the **Actions** tab in GitHub.
2. Select **Deploy Safe-Circle Backend to AWS EC2**.
3. Click **Run workflow** ➔ Select branch `main` ➔ Click **Run workflow**.

---

## 🔍 Part 4: Verification & Monitoring

### 1. Test API & Documentation
- **Direct API endpoint**: `http://<app_elastic_ip>:5001/`
- **Reverse Proxy HTTP**: `http://<app_elastic_ip>/`
- **Interactive Swagger Docs**: `http://<app_elastic_ip>:5001/api-docs/`

### 2. Live SSH Inspection & Troubleshooting
```bash
# SSH into App Server
ssh -i ~/.ssh/safe-circle-key ubuntu@<app_elastic_ip>

# Check container status
cd /opt/safe-circle
docker compose ps

# View live application logs
docker compose logs -f backend

# Verify memory & swap usage
free -h

# Check Nginx reverse proxy logs
docker compose logs -f nginx
```

---

## 🧹 Teardown / Cleanup
To destroy all provisioned AWS resources and stop billing:
```bash
cd terraform
terraform destroy
```
