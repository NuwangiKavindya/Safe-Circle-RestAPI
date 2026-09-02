variable "aws_region" {
  description = "AWS region for provisioning resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project identifier used in resource naming and tags"
  type        = string
  default     = "safe-circle"
}

variable "instance_type" {
  description = "EC2 instance type for backend & database instances"
  type        = string
  default     = "t3.micro"
}

variable "create_separate_db_instance" {
  description = "If true, provisions a separate t3.micro EC2 instance dedicated for PostgreSQL. If false, runs PostgreSQL on the same instance."
  type        = bool
  default     = true
}

variable "public_key" {
  description = "SSH public key content to create an AWS Key Pair (leave empty if using existing key_name)"
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Name of an existing AWS Key Pair. If public_key is provided, a new key pair with this name is created."
  type        = string
  default     = "safe-circle-key"
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to connect via SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "app_port" {
  description = "Port on which the Safe-Circle Node.js backend listens"
  type        = number
  default     = 5001
}

variable "db_port" {
  description = "PostgreSQL database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "safe_circle"
}

variable "db_user" {
  description = "Initial PostgreSQL database user"
  type        = string
  default     = "safe_circle_user"
}

variable "db_password" {
  description = "Initial PostgreSQL database password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "volume_size" {
  description = "Root EBS volume size in GB (gp3)"
  type        = number
  default     = 20
}

variable "swap_size_gb" {
  description = "Swap space in GB to configure on each t3.micro instance (prevents OOM)"
  type        = number
  default     = 2
}
