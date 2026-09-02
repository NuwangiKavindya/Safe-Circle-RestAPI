output "app_elastic_ip" {
  description = "Public Elastic IP assigned to the App Server (Use as EC2_HOST in GitHub Secrets)"
  value       = aws_eip.app.public_ip
}

output "app_public_dns" {
  description = "Public DNS of the App Server"
  value       = aws_instance.app.public_dns
}

output "app_ssh_command" {
  description = "Command to SSH directly into the App Server"
  value       = "ssh -i <path-to-private-key> ubuntu@${aws_eip.app.public_ip}"
}

output "app_api_url" {
  description = "Base API URL for the Safe-Circle backend"
  value       = "http://${aws_eip.app.public_ip}:${var.app_port}"
}

output "db_private_ip" {
  description = "Internal Private IP of the PostgreSQL Database Server (Set as DB_HOST in backend .env / GitHub Secrets)"
  value       = var.create_separate_db_instance ? aws_instance.db[0].private_ip : "127.0.0.1"
}

output "db_public_ip" {
  description = "Public IP of the Database Server (for admin SSH maintenance)"
  value       = var.create_separate_db_instance ? aws_instance.db[0].public_ip : aws_eip.app.public_ip
}

output "db_ssh_command" {
  description = "Command to SSH into the Database Server"
  value       = var.create_separate_db_instance ? "ssh -i <path-to-private-key> ubuntu@${aws_instance.db[0].public_ip}" : "Same as app_ssh_command"
}

output "db_name" {
  description = "PostgreSQL Database Name"
  value       = var.db_name
}

output "db_user" {
  description = "PostgreSQL Database User"
  value       = var.db_user
}

output "db_password" {
  description = "PostgreSQL Database Password (Run `terraform output -raw db_password` to view)"
  value       = local.db_password
  sensitive   = true
}
