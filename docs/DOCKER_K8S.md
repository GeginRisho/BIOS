# Docker & Kubernetes Deployment Guide

This document describes how to deploy BIOS in production using containers and cluster orchestrations.

---

## 1. Production Docker-Compose configuration
In local test environments, we run raw DB engines in containers. In production, we run the microservices themselves containerized and proxy them via Nginx:

```yaml
version: '3.8'

services:
  # API Reverse Proxy Routing
  gateway:
    build: ./gateway
    ports:
      - "80:80"
    depends_on:
      - auth-service
      - business-service

  # Microservices
  auth-service:
    build:
      context: ./services
      dockerfile: auth_service/Dockerfile
    ports:
      - "8001:8001"
    environment:
      - POSTGRES_HOST=postgres-production-db
      - JWT_SECRET_KEY=secure-production-only-token

  business-service:
    build:
      context: ./services
      dockerfile: business_service/Dockerfile
    ports:
      - "8002:8002"
    environment:
      - POSTGRES_HOST=postgres-production-db
      - KAFKA_BOOTSTRAP_SERVERS=kafka-production:9092
```

---

## 2. Kubernetes Deployment Topology
All pods reside inside the `bios-production` namespace. Deployments are mapped with replication factors for auto-scaling under traffic.

### Pod Scaling Configurations
- **Gateway (Ingress-Nginx):** 2 replicas with active load balancer routing.
- **Auth Service:** 3 replicas to guarantee SSO and validation uptime.
- **Crawler Service:** 4 replicas to manage scraping threads.
- **Frontends:** 2 replicas serving Static/SSR Next.js pages.

### Applying Manifests
To deploy to a live GKE or EKS cluster, run:
```bash
# Create namespace
kubectl apply -f k8s/deployment.yaml

# Apply Ingress controller and SSL bindings
kubectl apply -f k8s/ingress.yaml
```

---

## 3. Production Release Checklist

- [ ] All database instances (RDS Postgres, Managed Neo4j Aura, Qdrant Cloud) are isolated on private subnets.
- [ ] CORS policies on Gateway restrict traffic to authorized client domain hosts.
- [ ] Database credentials, secret keys, and JWT keys are stored in AWS Secrets Manager or HashiCorp Vault.
- [ ] Container limits set to prevent memory leaks or compute exhaustion.
- [ ] Ingress SSL certificates bound with automated Let's Encrypt renewal protocols.
- [ ] Prometheus metrics scrapers and Grafana boards are configured to display status details.
- [ ] Jaeger distributed tracing spans are tracking cross-service calls.
