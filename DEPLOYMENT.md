# 🚀 FinTrack Pro - Production Deployment Guide

Complete guide for deploying FinTrack Pro to production environments.

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Local Development Setup](#local-development-setup)
- [Production Deployment (Single VM/VPS)](#production-deployment-single-vmvps)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Environment Configuration](#environment-configuration)
- [Health Check Verification](#health-check-verification)
- [Post-Deployment Testing](#post-deployment-testing)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Scaling & Performance](#scaling--performance)

---

## System Requirements

### Minimum Hardware (Development)

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 10 GB SSD
- **OS**: Linux (Ubuntu 22.04+), macOS 12+, Windows 10+ with WSL2

### Recommended Hardware (Production)

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS or Amazon Linux 2
- **Network**: Static IP or domain name

### Software Dependencies

- **Docker**: 24.0+ ([Install Guide](https://docs.docker.com/engine/install/))
- **Docker Compose**: 2.20+ (bundled with Docker Desktop)
- **Git**: 2.30+
- **Node.js**: 20+ (for local development)
- **Python**: 3.11+ (for ML service local development)

---

## Pre-Deployment Checklist

### Security Preparation

- [ ] Generate strong JWT secrets (≥32 characters)
  ```bash
  openssl rand -base64 48
  ```
- [ ] Create production MongoDB credentials (not `fintrack123`)
- [ ] Create production Redis password (not `fintrack123`)
- [ ] Obtain SSL/TLS certificate (Let's Encrypt for free HTTPS)
- [ ] Configure firewall rules (only open ports 80, 443, 22)

### Service Account Setup

- [ ] **MongoDB Atlas** (optional): Create cluster and get connection string
- [ ] **Redis Cloud** (optional): Create instance or use self-hosted
- [ ] **Google OAuth** (optional): Configure OAuth 2.0 credentials ([Guide](../GOOGLE_OAUTH_SETUP.md))
- [ ] **GitHub OAuth** (optional): Create OAuth App
- [ ] **Plaid** (optional): Get API keys for banking integration
- [ ] **Anthropic Claude** (optional): Get API key for AI features
- [ ] **Sentry** (optional): Create project for error tracking

### Domain & DNS (Production)

- [ ] Register domain name (e.g., `fintrack.yourcompany.com`)
- [ ] Configure DNS A record pointing to server IP
- [ ] Setup subdomain for API (e.g., `api.fintrack.yourcompany.com`)

---

## Local Development Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/fintrack-pro.git
cd FinTrack
```

### Step 2: Create Environment Files

```bash
# Backend environment
cat > fintrack-pro/backend/.env <<EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ML_SERVICE_URL=http://localhost:8000
EOF

# Frontend environment
cat > fintrack-pro/frontend/.env <<EOF
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
EOF

# ML Service environment
cat > ml-service/.env <<EOF
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379/1
MODEL_DIR=/app/models
EOF
```

### Step 3: Start Services with Docker Compose

```bash
cd fintrack-pro
docker compose up --build -d
```

### Step 4: Verify Services

```bash
# Check all containers are healthy
docker ps

# Should show 5 containers:
# - fintrack-mongodb (healthy)
# - fintrack-redis (healthy)
# - fintrack-ml (healthy)
# - fintrack-backend (healthy)
# - fintrack-frontend (healthy)

# Check health endpoints
curl http://localhost:5000/api/health
curl http://localhost:8000/health
```

### Step 5: Seed Demo Data (Optional)

```bash
# Enter backend container
docker exec -it fintrack-backend sh

# Run seed script
npm run seed

# Login with demo account:
# Email: demo@fintrack.pro
# Password: Demo@123
```

---

## Production Deployment (Single VM/VPS)

### Step 1: Server Provisioning

**Option A: AWS EC2**
```bash
# Launch t3.medium instance (2 vCPU, 4 GB RAM)
# AMI: Ubuntu 22.04 LTS
# Security Group: Allow ports 22, 80, 443
```

**Option B: DigitalOcean Droplet**
```bash
# Create Droplet: $24/month (4 GB RAM)
# OS: Ubuntu 22.04 LTS
# Enable SSH keys
```

**Option C: Azure VM**
```bash
# Create VM: Standard_B2s (2 vCPU, 4 GB RAM)
# OS: Ubuntu 22.04 LTS
# Network: Allow HTTP, HTTPS, SSH
```

### Step 2: Server Initial Setup

```bash
# SSH into server
ssh user@your-server-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Logout and login again for group changes
exit
ssh user@your-server-ip
```

### Step 3: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/fintrack-pro.git
sudo chown -R $USER:$USER fintrack-pro
cd fintrack-pro
```

### Step 4: Configure Production Environment

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
MONGO_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create production .env
cat > fintrack-pro/.env <<EOF
# Production Environment Variables
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Optional OAuth (leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Optional Monitoring
SENTRY_DSN=
EOF

# Update docker-compose.yml with generated passwords
# (Edit MONGO_INITDB_ROOT_PASSWORD and REDIS requirepass)
nano fintrack-pro/docker-compose.yml
```

### Step 5: Deploy Application

```bash
cd fintrack-pro

# Pull latest images (if using pre-built images)
docker compose pull

# Build and start services
docker compose up --build -d

# Monitor startup logs
docker compose logs -f

# Wait for all services to become healthy (2-3 minutes)
watch -n 5 'docker ps'
```

### Step 6: Configure Nginx Reverse Proxy

```bash
# Install Nginx on host (for SSL termination)
sudo apt install nginx certbot python3-certbot-nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/fintrack

# Add configuration (see Nginx Config section below)

# Enable site
sudo ln -s /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d fintrack.yourcompany.com
```

---

## Docker Compose Deployment

### Full docker-compose.yml Structure

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: fintrack
      MONGO_INITDB_ROOT_PASSWORD: CHANGE_THIS_IN_PRODUCTION
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass CHANGE_THIS_IN_PRODUCTION
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "CHANGE_THIS_IN_PRODUCTION", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  ml-service:
    build: ../ml-service
    restart: unless-stopped
    environment:
      MONGODB_URI: mongodb://fintrack:MONGO_PASSWORD@mongodb:27017/fintrack-pro?authSource=admin
      REDIS_URL: redis://:REDIS_PASSWORD@redis:6379/1
      MODEL_DIR: /app/models
    volumes:
      - ml_models:/app/models
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://fintrack:MONGO_PASSWORD@mongodb:27017/fintrack-pro?authSource=admin
      REDIS_URL: redis://:REDIS_PASSWORD@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ML_SERVICE_URL: http://ml-service:8000
    volumes:
      - backend_uploads:/app/uploads
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
      ml-service:
        condition: service_healthy

  frontend:
    build: ./frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy

volumes:
  mongodb_data:
  redis_data:
  ml_models:
  backend_uploads:
```

### Nginx Configuration (SSL Termination)

```nginx
# /etc/nginx/sites-available/fintrack
server {
    listen 80;
    server_name fintrack.yourcompany.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fintrack.yourcompany.com;

    # SSL Configuration (certbot will add these)
    ssl_certificate /etc/letsencrypt/live/fintrack.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fintrack.yourcompany.com/privkey.pem;

    # Frontend (static files)
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## Environment Configuration

### Production Environment Variables

See [ENV_VARS.md](./ENV_VARS.md) for complete reference.

**Critical Variables**:
```bash
# Backend
NODE_ENV=production
JWT_SECRET=<48-char-from-openssl-rand-base64-48>
JWT_REFRESH_SECRET=<48-char-from-openssl-rand-base64-48>
MONGODB_URI=mongodb://user:pass@mongodb:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:password@redis:6379
FRONTEND_URL=https://fintrack.yourcompany.com
CORS_ORIGINS=https://fintrack.yourcompany.com
ML_SERVICE_URL=http://ml-service:8000
SECURE_COOKIES=true

# Frontend
VITE_API_URL=https://fintrack.yourcompany.com/api
VITE_WS_URL=wss://fintrack.yourcompany.com

# ML Service
MONGODB_URI=mongodb://user:pass@mongodb:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:password@redis:6379/1
MODEL_DIR=/app/models
DEBUG=false
```

---

## Health Check Verification

### Check All Services

```bash
# Docker containers status
docker ps

# Backend health
curl http://localhost:5000/api/health
# Expected: {"status":"healthy","services":{"mongodb":"connected","redis":"connected"}}

# ML Service health
curl http://localhost:8000/health
# Expected: {"status":"healthy","models_loaded":true}

# Frontend accessibility
curl -I http://localhost:3001
# Expected: HTTP/1.1 200 OK
```

### Service Dependency Chain

```
1. MongoDB (depends on: none)
   └─> Status: docker exec fintrack-mongodb mongosh --eval "db.adminCommand('ping')"

2. Redis (depends on: none)
   └─> Status: docker exec fintrack-redis redis-cli -a password ping

3. ML Service (depends on: MongoDB, Redis)
   └─> Status: curl http://localhost:8000/health
   └─> Models: ls -lh ml-service/models/

4. Backend (depends on: MongoDB, Redis, ML Service)
   └─> Status: curl http://localhost:5000/api/health
   └─> Logs: docker logs fintrack-backend --tail 50

5. Frontend (depends on: Backend)
   └─> Status: curl -I http://localhost:3001
   └─> Build: docker exec fintrack-frontend ls -lh /usr/share/nginx/html/
```

---

## Post-Deployment Testing

### 1. Create Test User

```bash
# Via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### 3. Test ML Service

```bash
# Forecast
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "days": 30
  }'

# Category prediction
curl -X POST http://localhost:8000/category/predict \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Starbucks Coffee Purchase"
  }'
```

### 4. Test File Upload (Receipt OCR)

```bash
# Upload test receipt
curl -X POST http://localhost:5000/api/transactions/receipt/scan \
  -H "Authorization: Bearer <jwt_token>" \
  -F "receipt=@test-receipt.jpg"
```

---

## Monitoring & Maintenance

### Log Management

```bash
# View live logs
docker compose logs -f

# View specific service
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail 100 backend

# Export logs to file
docker compose logs --no-color > fintrack-logs-$(date +%Y%m%d).log

# Log files inside containers
docker exec -it fintrack-backend cat /app/logs/error.log
docker exec -it fintrack-ml cat /app/logs/ml-service.log
```

### Database Backups

```bash
# MongoDB backup (daily cron job)
docker exec fintrack-mongodb mongodump \
  --archive=/data/backup-$(date +%Y%m%d).gz \
  --gzip \
  --username fintrack \
  --password YOUR_PASSWORD \
  --authenticationDatabase admin

# Copy backup to host
docker cp fintrack-mongodb:/data/backup-$(date +%Y%m%d).gz ./backups/

# Restore from backup
docker exec -i fintrack-mongodb mongorestore \
  --archive=/data/backup-20250115.gz \
  --gzip \
  --username fintrack \
  --password YOUR_PASSWORD \
  --authenticationDatabase admin
```

### Automated Backup Script

```bash
#!/bin/bash
# /opt/fintrack-pro/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fintrack-pro/backups"
RETENTION_DAYS=30

# Backup MongoDB
docker exec fintrack-mongodb mongodump \
  --archive=/data/backup-${DATE}.gz \
  --gzip \
  --username fintrack \
  --password YOUR_PASSWORD \
  --authenticationDatabase admin

# Copy to host
docker cp fintrack-mongodb:/data/backup-${DATE}.gz ${BACKUP_DIR}/

# Backup uploads directory
tar -czf ${BACKUP_DIR}/uploads-${DATE}.tar.gz \
  -C /opt/fintrack-pro/fintrack-pro/backend uploads/

# Delete old backups
find ${BACKUP_DIR} -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
```

**Add to crontab**:
```bash
# Daily backup at 2 AM
crontab -e
0 2 * * * /opt/fintrack-pro/scripts/backup.sh >> /var/log/fintrack-backup.log 2>&1
```

### Update Application

```bash
# Pull latest code
cd /opt/fintrack-pro
git pull origin main

# Rebuild containers
cd fintrack-pro
docker compose down
docker compose up --build -d

# Verify deployment
docker ps
docker compose logs -f
```

---

## Troubleshooting

### Issue: Container Fails to Start

**Symptom**: Container exits immediately after `docker compose up`

**Diagnosis**:
```bash
# Check logs
docker compose logs backend

# Check exit code
docker inspect fintrack-backend --format='{{.State.ExitCode}}'
```

**Common Causes**:
1. **Environment validation failed**: Check JWT_SECRET length (≥32 chars)
   ```bash
   docker compose logs backend | grep "Validation Failed"
   ```

2. **MongoDB connection refused**: Verify MongoDB container is healthy
   ```bash
   docker exec fintrack-mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. **Port already in use**: Another service using port 5000
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

---

### Issue: Health Check Fails

**Symptom**: Container status shows "unhealthy"

**Diagnosis**:
```bash
# Check health check logs
docker inspect fintrack-backend --format='{{json .State.Health}}' | jq

# Test health endpoint manually
docker exec fintrack-backend curl -f http://localhost:5000/api/health
```

**Solutions**:
1. **Extend start_period**: Services may need more time to initialize
   ```yaml
   healthcheck:
     start_period: 60s  # Increase from 40s
   ```

2. **Check dependencies**: Ensure MongoDB and Redis are healthy first
   ```bash
   docker compose ps
   ```

---

### Issue: Frontend Shows 502 Bad Gateway

**Symptom**: Nginx returns 502 when accessing frontend

**Diagnosis**:
```bash
# Check if backend is responding
curl http://localhost:5000/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions**:
1. **Backend not started**: Wait for backend container to become healthy
2. **CORS issue**: Verify FRONTEND_URL and CORS_ORIGINS match production domain
3. **Firewall blocking**: Check Docker network connectivity
   ```bash
   docker network inspect fintrack-pro_fintrack-network
   ```

---

### Issue: ML Service Models Not Training

**Symptom**: ML service returns "Model not found" errors

**Diagnosis**:
```bash
# Check model directory
docker exec fintrack-ml ls -lh /app/models/

# Check training logs
docker compose logs ml-service | grep "training"
```

**Solutions**:
1. **Manual model training**:
   ```bash
   docker exec fintrack-ml python scripts/train_models.py
   ```

2. **Permission issue**: Ensure model directory is writable
   ```bash
   docker exec fintrack-ml chmod 777 /app/models
   ```

---

## Scaling & Performance

### Vertical Scaling (Single Server)

**Current**: 2 vCPU, 4 GB RAM  
**Upgrade**: 4 vCPU, 8 GB RAM

```bash
# No code changes needed
# Just resize VM/container and restart services
docker compose down
docker compose up -d
```

### Horizontal Scaling (Multiple Servers)

**Architecture**:
```
           ┌─────────────┐
           │ Load Balancer│
           │   (Nginx)    │
           └──────┬───────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
  │Backend 1│ │Backend 2│ │Backend 3│
  └────┬────┘ └────┬───┘ └────┬───┘
       │           │           │
       └───────────┼───────────┘
                   │
         ┌─────────▼──────────┐
         │   MongoDB Cluster   │
         │   (Replica Set)     │
         └─────────────────────┘
```

---

## Performance Optimization

### 1. Enable Redis Caching

```typescript
// Backend - Cache frequently accessed data
import { redis } from './config/redis';

// Cache user profile for 5 minutes
const cachedUser = await redis.get(`user:${userId}`);
if (cachedUser) return JSON.parse(cachedUser);

const user = await User.findById(userId);
await redis.setex(`user:${userId}`, 300, JSON.stringify(user));
```

### 2. Database Indexing

```javascript
// MongoDB indexes (add to models)
// backend/src/models/Transaction.ts
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
```

### 3. CDN for Static Assets

```nginx
# Nginx - Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Cost Estimation

### AWS Deployment (Monthly)

- **EC2 t3.medium**: $30/month (2 vCPU, 4 GB RAM)
- **EBS Storage**: $5/month (50 GB SSD)
- **Data Transfer**: $9/month (100 GB egress)
- **Route53 DNS**: $0.50/month
- **Total**: ~$45/month

### DigitalOcean Deployment

- **Droplet**: $24/month (2 vCPU, 4 GB RAM, 80 GB SSD)
- **Backups**: $4.80/month (20% addon)
- **Total**: ~$29/month

### Self-Hosted (VPS)

- **Linode/Vultr**: $12-24/month (2-4 GB RAM)
- **Domain**: $12/year
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$13-25/month

---

## Support & Resources

### Documentation

- **Environment Variables**: [ENV_VARS.md](./ENV_VARS.md)
- **Backend Fixes**: [fintrack-pro/backend/README_FIXES.md](./fintrack-pro/backend/README_FIXES.md)
- **Google OAuth**: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- **Feature Audit**: [FEATURE_AUDIT.md](./FEATURE_AUDIT.md)

### Useful Commands

```bash
# Restart all services
docker compose restart

# Rebuild single service
docker compose up --build -d backend

# View resource usage
docker stats

# Clean up old images
docker system prune -a

# Export database
docker exec fintrack-mongodb mongodump --out=/data/dump
docker cp fintrack-mongodb:/data/dump ./mongodb-backup

# Scale service (horizontal scaling)
docker compose up --scale backend=3 -d
```

---

**Last Updated**: January 2025  
**Status**: Production Ready ✅  
**Maintainer**: FinTrack Pro Engineering Team
