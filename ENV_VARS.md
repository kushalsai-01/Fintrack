# 🔐 FinTrack Pro - Environment Variables Reference

This document provides a comprehensive reference for all environment variables used across FinTrack Pro services.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Backend (Node.js/Express)](#backend-nodejsexpress)
- [Frontend (React/Vite)](#frontend-reactvite)
- [ML Service (Python/FastAPI)](#ml-service-pythonfastapi)
- [Database & Cache](#database--cache)
- [External Integrations](#external-integrations)
- [Production Deployment](#production-deployment)
- [Example .env Files](#example-env-files)

---

## Quick Start

### Minimum Required Variables (Development)

```bash
# Backend
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-minimum-32-characters-long

# Frontend
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000

# ML Service
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379/1
MODEL_DIR=/app/models
```

---

## Backend (Node.js/Express)

Location: `fintrack-pro/backend/.env`

### Core Configuration

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `NODE_ENV` | `development`, `production`, `test` | Runtime environment | ✅ Yes | - |
| `PORT` | `5000` | HTTP server port | ❌ No | `5000` |
| `HOST` | `0.0.0.0` | Server bind address | ❌ No | `0.0.0.0` |

### Database & Cache

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `MONGODB_URI` | `mongodb://user:pass@localhost:27017/fintrack-pro?authSource=admin` | MongoDB connection string | ✅ Yes | - |
| `REDIS_URL` | `redis://:password@localhost:6379` | Redis connection URL | ✅ Yes | - |
| `REDIS_DB` | `0` | Redis database number | ❌ No | `0` |
| `MONGO_POOL_SIZE` | `10` | MongoDB connection pool size | ❌ No | `10` |

### Authentication & Security

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `JWT_SECRET` | `your-super-secure-jwt-secret-key-minimum-32-characters-long` | JWT signing secret (≥32 chars) | ✅ Yes | - |
| `JWT_REFRESH_SECRET` | `your-super-secure-refresh-secret-key-minimum-32-characters-long` | JWT refresh token secret (≥32 chars) | ✅ Yes | - |
| `JWT_EXPIRES_IN` | `7d`, `24h`, `3600` | Access token expiration | ❌ No | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | `30d`, `720h` | Refresh token expiration | ❌ No | `30d` |
| `BCRYPT_ROUNDS` | `12` | Password hashing rounds | ❌ No | `12` |
| `SESSION_SECRET` | `your-session-secret-key` | Express session secret | ❌ No | Auto-generated |
| `SECURE_COOKIES` | `true`, `false` | Enable secure cookies (HTTPS) | ❌ No | `true` (prod) |

### CORS & Frontend

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `FRONTEND_URL` | `http://localhost:3001` | Frontend application URL | ✅ Yes | - |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins (comma-separated) | ✅ Yes | - |

### External Services

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `ML_SERVICE_URL` | `http://localhost:8000`, `http://ml-service:8000` | ML service endpoint | ✅ Yes | - |

### OAuth Providers (Optional)

#### Google OAuth

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `GOOGLE_CLIENT_ID` | `123456789-abcdef.apps.googleusercontent.com` | Google OAuth client ID | ❌ No | - |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxxxxxxxxxx` | Google OAuth client secret | ❌ No | - |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/oauth/google/callback` | OAuth redirect URI | ❌ No | `/api/oauth/google/callback` |

#### GitHub OAuth

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `GITHUB_CLIENT_ID` | `Iv1.abcdef1234567890` | GitHub OAuth client ID | ❌ No | - |
| `GITHUB_CLIENT_SECRET` | `ghp_xxxxxxxxxxxxxxxxxxxx` | GitHub OAuth client secret | ❌ No | - |
| `GITHUB_CALLBACK_URL` | `http://localhost:5000/api/oauth/github/callback` | OAuth redirect URI | ❌ No | `/api/oauth/github/callback` |

### Email (SMTP) - Optional

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname | ❌ No | - |
| `SMTP_PORT` | `587` | SMTP server port | ❌ No | `587` |
| `SMTP_USER` | `your-email@gmail.com` | SMTP username | ❌ No | - |
| `SMTP_PASS` | `your-app-password` | SMTP password | ❌ No | - |
| `SMTP_FROM` | `FinTrack <noreply@fintrack.pro>` | Default sender email | ❌ No | - |
| `SMTP_SECURE` | `true`, `false` | Use TLS/SSL | ❌ No | `false` |

### Plaid Banking Integration - Optional

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `PLAID_CLIENT_ID` | `abcdef1234567890` | Plaid client ID | ❌ No | - |
| `PLAID_SECRET` | `xxxxxxxxxxxxxxxx` | Plaid secret key | ❌ No | - |
| `PLAID_ENV` | `sandbox`, `development`, `production` | Plaid environment | ❌ No | `sandbox` |

### Anthropic Claude API - Optional

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxxxxxxxxxxx` | Claude API key (for AI features) | ❌ No | - |
| `CLAUDE_MODEL` | `claude-3-5-sonnet-20241022` | Claude model version | ❌ No | `claude-3-5-sonnet-20241022` |

### Monitoring & Observability - Optional

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `SENTRY_DSN` | `https://xxxxx@sentry.io/123456` | Sentry error tracking DSN | ❌ No | - |
| `SENTRY_ENVIRONMENT` | `production`, `staging` | Sentry environment name | ❌ No | `process.env.NODE_ENV` |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | Winston logging level | ❌ No | `info` |
| `LOG_TO_FILE` | `true`, `false` | Enable file logging | ❌ No | `true` (prod) |

### File Upload Configuration

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `UPLOAD_DIR` | `/app/uploads` | File upload directory | ❌ No | `./uploads` |
| `MAX_FILE_SIZE` | `10485760` | Max upload size in bytes (10MB) | ❌ No | `10485760` |
| `ALLOWED_FILE_TYPES` | `jpg,jpeg,png,pdf` | Allowed file extensions (comma-separated) | ❌ No | `jpg,jpeg,png,pdf` |

---

## Frontend (React/Vite)

Location: `fintrack-pro/frontend/.env`

> **Note**: Vite only exposes variables prefixed with `VITE_` to the client bundle.

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL | ✅ Yes | - |
| `VITE_WS_URL` | `ws://localhost:5000` | WebSocket server URL | ✅ Yes | - |
| `VITE_APP_NAME` | `FinTrack Pro` | Application display name | ❌ No | `FinTrack Pro` |
| `VITE_ENABLE_ANALYTICS` | `true`, `false` | Enable Google Analytics | ❌ No | `false` |
| `VITE_GA_TRACKING_ID` | `G-XXXXXXXXXX` | Google Analytics ID | ❌ No | - |
| `VITE_SENTRY_DSN` | `https://xxxxx@sentry.io/123456` | Frontend error tracking | ❌ No | - |
| `VITE_ENVIRONMENT` | `production`, `staging` | Build environment | ❌ No | `production` |

### Build-time Variables (Dockerfile ARG)

These are passed during Docker build:

```dockerfile
# In fintrack-pro/frontend/Dockerfile
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_WS_URL=ws://localhost:5000
```

---

## ML Service (Python/FastAPI)

Location: `ml-service/.env`

### Core Configuration

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `PYTHONUNBUFFERED` | `1` | Disable Python output buffering | ❌ No | `1` |
| `DEBUG` | `true`, `false` | Enable debug mode | ❌ No | `false` |
| `PORT` | `8000` | FastAPI server port | ❌ No | `8000` |
| `HOST` | `0.0.0.0` | Server bind address | ❌ No | `0.0.0.0` |
| `WORKERS` | `4` | Uvicorn worker count | ❌ No | `1` |

### Database & Cache

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `MONGODB_URI` | `mongodb://user:pass@localhost:27017/fintrack-pro?authSource=admin` | MongoDB connection string | ✅ Yes | - |
| `REDIS_URL` | `redis://:password@localhost:6379/1` | Redis connection URL (note: different DB number) | ✅ Yes | - |

### ML Model Configuration

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `MODEL_DIR` | `/app/models` | Directory for model artifacts | ✅ Yes | `/app/models` |
| `AUTO_TRAIN_MODELS` | `true`, `false` | Auto-train models on startup if missing | ❌ No | `true` |
| `MODEL_CACHE_TTL` | `3600` | Model cache TTL in seconds | ❌ No | `3600` |

### OCR Configuration

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `TESSERACT_PATH` | `/usr/bin/tesseract` | Tesseract binary path | ❌ No | Auto-detected |
| `TESSERACT_LANG` | `eng` | OCR language | ❌ No | `eng` |
| `OCR_DPI` | `300` | Image DPI for OCR | ❌ No | `300` |

### Rate Limiting

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `RATE_LIMIT_PER_MINUTE` | `100` | Requests per minute per IP | ❌ No | `100` |
| `RATE_LIMIT_ENABLED` | `true`, `false` | Enable rate limiting | ❌ No | `true` |

### Logging

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `LOG_LEVEL` | `ERROR`, `WARNING`, `INFO`, `DEBUG` | Python logging level | ❌ No | `INFO` |
| `LOG_TO_FILE` | `true`, `false` | Enable file logging | ❌ No | `true` (prod) |
| `LOG_FILE_PATH` | `/app/logs/ml-service.log` | Log file location | ❌ No | `/app/logs/ml-service.log` |

---

## Database & Cache

### MongoDB

If running in Docker Compose, these are configured automatically:

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `MONGO_INITDB_ROOT_USERNAME` | `fintrack` | MongoDB root username | ✅ Yes | - |
| `MONGO_INITDB_ROOT_PASSWORD` | `fintrack123` | MongoDB root password | ✅ Yes | - |
| `MONGO_INITDB_DATABASE` | `fintrack-pro` | Initial database name | ❌ No | `fintrack-pro` |

### Redis

| Variable | Example | Description | Required | Default |
|----------|---------|-------------|----------|---------|
| `REDIS_PASSWORD` | `fintrack123` | Redis password (set via `--requirepass`) | ✅ Yes | - |
| `REDIS_MAXMEMORY` | `256mb` | Max memory for Redis | ❌ No | - |
| `REDIS_MAXMEMORY_POLICY` | `allkeys-lru` | Eviction policy | ❌ No | - |

---

## External Integrations

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:5000/api/oauth/google/callback`
5. Copy Client ID and Client Secret to `.env`

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
```

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:5000/api/oauth/github/callback`
4. Copy Client ID and generate Client Secret

```bash
GITHUB_CLIENT_ID=Iv1.abcdef1234567890
GITHUB_CLIENT_SECRET=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Plaid Banking Integration

1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com/)
2. Get your Client ID and Secret keys
3. Start with `sandbox` environment for testing

```bash
PLAID_CLIENT_ID=abcdef1234567890abcdef
PLAID_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PLAID_ENV=sandbox
```

### Claude AI API

1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Generate API key
3. Note: Claude API is optional (for advanced AI features)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

---

## Production Deployment

### Critical Security Checklist

Before deploying to production:

- [ ] **Change all default passwords**: MongoDB, Redis, JWT secrets
- [ ] **Generate strong JWT secrets**: Use `openssl rand -base64 48` (≥32 chars required)
- [ ] **Set NODE_ENV=production**: Enables security features and optimizations
- [ ] **Enable HTTPS**: Set `SECURE_COOKIES=true` and configure SSL certificates
- [ ] **Restrict CORS_ORIGINS**: Only allow your production domain(s)
- [ ] **Setup monitoring**: Configure Sentry DSN for error tracking
- [ ] **Enable rate limiting**: Prevent abuse and DDoS attacks
- [ ] **Secure database access**: Use strong passwords, enable auth, restrict network access
- [ ] **Backup strategy**: Configure automated MongoDB backups
- [ ] **Log rotation**: Setup log file rotation to prevent disk space issues

### Production Environment Variables

```bash
# Backend (Production)
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://fintrack:<strong-password>@mongodb:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:<strong-password>@redis:6379
JWT_SECRET=<48-char-random-string-from-openssl-rand-base64-48>
JWT_REFRESH_SECRET=<48-char-random-string-from-openssl-rand-base64-48>
FRONTEND_URL=https://fintrack.yourcompany.com
CORS_ORIGINS=https://fintrack.yourcompany.com
ML_SERVICE_URL=http://ml-service:8000
SECURE_COOKIES=true
LOG_LEVEL=info
LOG_TO_FILE=true
SENTRY_DSN=https://xxxxx@sentry.io/123456

# Frontend (Production Build)
VITE_API_URL=https://api.fintrack.yourcompany.com/api
VITE_WS_URL=wss://api.fintrack.yourcompany.com
VITE_ENVIRONMENT=production

# ML Service (Production)
MONGODB_URI=mongodb://fintrack:<strong-password>@mongodb:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:<strong-password>@redis:6379/1
MODEL_DIR=/app/models
DEBUG=false
LOG_LEVEL=INFO
RATE_LIMIT_ENABLED=true
```

---

## Example .env Files

### Backend (.env.example)

```bash
# ===========================================
# FinTrack Pro - Backend Environment Config
# ===========================================

# Application
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379

# Authentication (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Frontend
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# External Services
ML_SERVICE_URL=http://localhost:8000

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Plaid (Optional)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# AI (Optional)
ANTHROPIC_API_KEY=

# Monitoring (Optional)
SENTRY_DSN=
LOG_LEVEL=info
```

### Frontend (.env.example)

```bash
# ===========================================
# FinTrack Pro - Frontend Environment Config
# ===========================================

VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
VITE_APP_NAME=FinTrack Pro
VITE_ENVIRONMENT=development

# Analytics (Optional)
VITE_ENABLE_ANALYTICS=false
VITE_GA_TRACKING_ID=

# Monitoring (Optional)
VITE_SENTRY_DSN=
```

### ML Service (.env.example)

```bash
# ===========================================
# FinTrack Pro - ML Service Environment
# ===========================================

# Application
PYTHONUNBUFFERED=1
DEBUG=false
PORT=8000

# Database
MONGODB_URI=mongodb://fintrack:fintrack123@localhost:27017/fintrack-pro?authSource=admin
REDIS_URL=redis://:fintrack123@localhost:6379/1

# ML Models
MODEL_DIR=/app/models
AUTO_TRAIN_MODELS=true

# OCR
TESSERACT_LANG=eng

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_TO_FILE=true
```

---

## Docker Compose Environment

### Using .env file with Docker Compose

Create `fintrack-pro/.env`:

```bash
# Docker Compose Environment Variables
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-minimum-32-characters-long
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

These variables are automatically loaded by `docker-compose.yml`:

```yaml
backend:
  environment:
    JWT_SECRET: ${JWT_SECRET:-default-dev-secret-change-in-production}
    JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-default-dev-secret-change-in-production}
```

---

## Validation & Troubleshooting

### Backend Environment Validation

The backend automatically validates environment variables on startup using Zod schema:

```typescript
// backend/src/utils/envValidation.ts
- ✅ JWT_SECRET must be ≥32 characters
- ✅ JWT_REFRESH_SECRET must be ≥32 characters
- ✅ MONGODB_URI must be valid connection string
- ✅ REDIS_URL must be valid URL
- ✅ NODE_ENV must be development/production/test
```

**Error Example**:
```
❌ Environment Validation Failed:
- JWT_SECRET: String must contain at least 32 character(s)
- MONGODB_URI: Invalid connection string
```

### Common Issues

**Issue**: Backend fails to start with "JWT_SECRET too short"  
**Solution**: Generate new secret: `openssl rand -base64 48`, must be ≥32 chars

**Issue**: Frontend can't connect to API  
**Solution**: Ensure `VITE_API_URL` matches backend `PORT` and `HOST`

**Issue**: ML service can't load models  
**Solution**: Check `MODEL_DIR` path exists and is writable, or enable `AUTO_TRAIN_MODELS=true`

**Issue**: OAuth redirect fails  
**Solution**: Verify `GOOGLE_CALLBACK_URL` matches the URL configured in Google Cloud Console

---

## Security Best Practices

1. **Never commit `.env` files**: Add to `.gitignore`
2. **Use secrets management**: AWS Secrets Manager, HashiCorp Vault, etc.
3. **Rotate credentials regularly**: Especially JWT secrets and database passwords
4. **Principle of least privilege**: Only grant necessary permissions
5. **Monitor environment variables**: Use Sentry to detect missing required vars
6. **Use different secrets per environment**: Don't reuse secrets between dev/staging/prod

---

**Last Updated**: January 2025  
**Maintainer**: FinTrack Pro Engineering Team  
**Support**: For questions, see [backend/README_FIXES.md](./fintrack-pro/backend/README_FIXES.md)
