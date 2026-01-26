# 🚀 FinTrack Pro - Quick Deployment Guide

## ✅ Pre-Deployment Checklist

### Required Values for .env Files

#### 🔐 CRITICAL - Generate These First
```bash
# Run this to generate secure JWT secrets:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to your `backend/.env` file.

---

## 🎯 DEVELOPMENT SETUP (Fastest Way to Run)

### Step 1: Create Environment Files

**backend/.env**
```env
NODE_ENV=development
PORT=5000

# MongoDB (local or Docker dev)
MONGODB_URI=mongodb://localhost:27017/fintrack-pro

# Redis (local or Docker dev)
REDIS_URL=redis://localhost:6379

# JWT Secrets (PASTE YOUR GENERATED SECRETS HERE)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_REFRESH_SECRET=YOUR_GENERATED_REFRESH_SECRET_HERE
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# App URLs
FRONTEND_URL=http://localhost:3001
ML_SERVICE_URL=http://localhost:8000

# File Uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# OAuth (OPTIONAL - leave empty to skip)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Email (OPTIONAL - leave empty to skip)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=FinTrack Pro <noreply@fintrack.pro>

# External APIs (OPTIONAL)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
EXCHANGE_RATE_API_KEY=
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_ML_URL=http://localhost:8000
VITE_APP_NAME=FinTrack Pro
VITE_APP_VERSION=1.0.0
```

**ml-service/.env**
```env
APP_NAME=FinTrack Pro ML Service
APP_VERSION=1.0.0
DEBUG=true
HOST=0.0.0.0
PORT=8000

MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=fintrack-pro
REDIS_URL=redis://localhost:6379
BACKEND_URL=http://localhost:5000

FORECAST_HORIZON_DAYS=30
ANOMALY_CONTAMINATION=0.1
MIN_DATA_POINTS=10
CACHE_TTL=3600
```

### Step 2: Start Development Environment

```powershell
# 1. Start databases (MongoDB + Redis)
.\start-dev.ps1

# 2. Install dependencies (one-time)
cd backend
npm install
cd ..\frontend
npm install
cd ..\ml-service
pip install -r requirements.txt
cd ..

# 3. Start services (in 3 separate terminals)

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - ML Service
cd ml-service
python run.py
```

### Step 3: Access Your App

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5000/api
- **ML Service Docs**: http://localhost:8000/docs
- **Redis Commander**: http://localhost:8081
- **Mongo Express**: http://localhost:8082

### Step 4: Create Your Account

1. Go to http://localhost:3001
2. Click "Register"
3. Create your account
4. Start tracking your finances!

---

## 🐳 DOCKER PRODUCTION DEPLOYMENT

### Step 1: Update docker-compose.yml Secrets

Edit `docker-compose.yml` and update these values:

```yaml
backend:
  environment:
    JWT_SECRET: YOUR_GENERATED_JWT_SECRET_HERE
    JWT_REFRESH_SECRET: YOUR_GENERATED_REFRESH_SECRET_HERE
```

### Step 2: Deploy

```powershell
# Windows
.\start-prod.ps1

# Linux/Mac
./start-prod.sh
```

### Step 3: Access

- **Application**: http://localhost:3000
- **API**: http://localhost:5000/api
- **ML Docs**: http://localhost:8000/docs

---

## 📋 REQUIRED vs OPTIONAL Values

### ✅ REQUIRED (Must Set)

| Variable | Where | Value |
|----------|-------|-------|
| `JWT_SECRET` | backend/.env | Generated secret (32+ chars) |
| `JWT_REFRESH_SECRET` | backend/.env | Generated secret (32+ chars) |
| `MONGODB_URI` | backend/.env, ml-service/.env | MongoDB connection string |
| `REDIS_URL` | backend/.env, ml-service/.env | Redis connection string |

### 🎨 OPTIONAL (Can Leave Empty)

| Feature | Variables | When Needed |
|---------|-----------|-------------|
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | If you want Google login |
| **GitHub OAuth** | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | If you want GitHub login |
| **Email** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | For password reset emails |
| **Bank Sync** | `PLAID_CLIENT_ID`, `PLAID_SECRET` | For connecting bank accounts |
| **Multi-Currency** | `EXCHANGE_RATE_API_KEY` | For currency conversion |

---

## 🎁 FREE API KEYS (No Credit Card Required)

If you want to enable optional features, here's how to get FREE API keys:

### Google OAuth (Login with Google)
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret

### GitHub OAuth (Login with GitHub)
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy Client ID and Secret

### Plaid (Bank Connection) - Sandbox is FREE
1. Go to https://dashboard.plaid.com/signup
2. Sign up for free sandbox access
3. Copy Client ID and Secret
4. Set `PLAID_ENV=sandbox`

### ExchangeRate API - FREE Tier
1. Go to https://exchangeratesapi.io/
2. Sign up for free tier (250 requests/month)
3. Copy API key

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution**: 
```powershell
# Check if MongoDB is running
docker ps | Select-String mongodb

# If not running, start databases:
.\start-dev.ps1
```

### Issue: "Port already in use"
**Solution**: 
```powershell
# Check what's using the port
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Issue: "Module not found"
**Solution**:
```powershell
# Reinstall dependencies
cd backend
Remove-Item -Recurse -Force node_modules
npm install

cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 🌐 PRODUCTION DEPLOYMENT

### For Cloud Deployment (AWS, Azure, Google Cloud):

1. **Update Environment Variables** in your cloud provider's environment settings
2. **Use Managed Databases**:
   - MongoDB Atlas (free tier): https://www.mongodb.com/cloud/atlas
   - Redis Cloud (free tier): https://redis.com/cloud/
3. **Update URLs** in .env files to point to your domain
4. **Enable HTTPS** in nginx configuration

### MongoDB Atlas Connection String:
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fintrack-pro?retryWrites=true&w=majority
```

### Redis Cloud Connection String:
```
REDIS_URL=redis://:<password>@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

---

## ✨ What Works Out of the Box

- ✅ User registration & login (email/password)
- ✅ Transaction tracking (manual entry)
- ✅ Categories & budgets
- ✅ Financial goals
- ✅ AI spending forecasts
- ✅ Anomaly detection
- ✅ Financial health score
- ✅ Charts & analytics
- ✅ Dark/Light mode

## 🎁 What Requires API Keys

- 🔑 Google/GitHub login → OAuth credentials
- 🔑 Bank account sync → Plaid API
- 🔑 Currency conversion → ExchangeRate API
- 🔑 Email notifications → SMTP credentials

---

**You can start using the app immediately with just JWT secrets!**
**All optional features can be added later.**
