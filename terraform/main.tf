terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

# 1. Virtual Private Cloud (VPC)
resource "aws_vpc" "bios_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "bios-production-vpc"
  }
}

# Subnets Provisioning
resource "aws_subnet" "bios_public_subnet" {
  count                   = 2
  vpc_id                  = aws_vpc.bios_vpc.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "bios-public-${count.index}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# 2. Elastic Kubernetes Service (EKS) IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "bios-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Cluster Provision
resource "aws_eks_cluster" "bios_eks" {
  name     = "bios-enterprise-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = aws_subnet.bios_public_subnet[*].id
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

# 3. Node Group IAM Role
resource "aws_iam_role" "eks_nodes_role" {
  name = "bios-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes_role.name
}

resource "aws_iam_role_policy_attachment" "cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes_role.name
}

resource "aws_iam_role_policy_attachment" "registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes_role.name
}

# Autoscaling Node Group
resource "aws_eks_node_group" "bios_nodes" {
  cluster_name    = aws_eks_cluster.bios_eks.name
  node_group_name = "bios-worker-nodes"
  node_role_arn   = aws_iam_role.eks_nodes_role.arn
  subnet_ids      = aws_subnet.bios_public_subnet[*].id
  instance_types  = ["t3.xlarge"]

  scaling_config {
    desired_size = 4
    max_size     = 10
    min_size     = 2
  }

  depends_on = [
    aws_iam_role_policy_attachment.worker_node_policy,
    aws_iam_role_policy_attachment.cni_policy,
    aws_iam_role_policy_attachment.registry_policy
  ]
}
