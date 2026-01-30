# ========================================================
# FINTRACK PRO - ENVIRONMENT CONFIGURATION GUIDE
# ========================================================
# This file documents all required environment variables
# Copy the values below to the respective .env files
# ========================================================

# ========================================================
# 1. BACKEND CONFIGURATION (backend/.env)
# ========================================================

# --- Server Settings ---
NODE_ENV=development
PORT=5000

# --- Database (Choose ONE option) ---

# Option A: Local MongoDB (without Docker)
MONGODB_URI=mongodb://localhost:27017/fintrack-pro

# Option B: Docker Development (no auth)
# MONGODB_URI=mongodb://mongodb:27017/fintrack-pro

# Option C: Docker Production (with auth)
# MONGODB_URI=mongodb://fintrack:fintrack123@mongodb:27017/fintrack-pro?authSource=admin

# --- Redis Cache (Choose ONE option) ---

# Option A: Local Redis
REDIS_URL=redis://localhost:6379

# Option B: Docker Development (no auth)
# REDIS_URL=redis://redis:6379

# Option C: Docker Production (with auth)
# REDIS_URL=redis://:fintrack123@redis:6379

# --- JWT Secrets (REQUIRED - Generate strong secrets) ---
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=af8e92d1c5b6a7e3f4d0c9b8a7e6f5d4c3b2a1e0f9d8c7b6a5e4f3d2c1b0a9e8
JWT_REFRESH_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2

# Token expiration
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# --- OAuth (OPTIONAL - Leave empty if not using) ---
# Get from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# --- Email (OPTIONAL - For password reset, reports) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=FinTrack Pro <noreply@fintrack.pro>

# --- App URLs ---
FRONTEND_URL=http://localhost:3001
ML_SERVICE_URL=http://localhost:8000

# --- File Uploads ---
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# --- External APIs (OPTIONAL) ---
# Plaid - Get from: https://dashboard.plaid.com/
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# Exchange rates - Get from: https://exchangeratesapi.io/
EXCHANGE_RATE_API_KEY=


# ========================================================
# 2. FRONTEND CONFIGURATION (frontend/.env)
# ========================================================

VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_ML_URL=http://localhost:8000
VITE_APP_NAME=FinTrack Pro
VITE_APP_VERSION=1.0.0


# ========================================================
# 3. ML SERVICE CONFIGURATION (ml-service/.env)
# ========================================================

APP_NAME=FinTrack Pro ML Service
APP_VERSION=1.0.0
DEBUG=true
HOST=0.0.0.0
PORT=8000

# --- Database (match backend settings) ---
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=fintrack-pro

# --- Redis (match backend settings) ---
REDIS_URL=redis://localhost:6379

# --- Backend API ---
BACKEND_URL=http://localhost:5000

# --- ML Settings ---
FORECAST_HORIZON_DAYS=30
ANOMALY_CONTAMINATION=0.1
MIN_DATA_POINTS=10
CACHE_TTL=3600


# ========================================================
# QUICK START INSTRUCTIONS
# ========================================================
#
# DEVELOPMENT MODE (Easiest):
# 1. Copy this configuration to the .env files:
#    - backend/.env
#    - frontend/.env  
#    - ml-service/.env
#
# 2. Generate JWT secrets:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# 3. Start databases:
#    .\start-dev.ps1  (Windows)
#    ./start-dev.sh   (Linux/Mac)
#
# 4. Install dependencies:
#    cd backend && npm install
#    cd frontend && npm install
#    cd ml-service && pip install -r requirements.txt
#
# 5. Start services (in separate terminals):
#    cd backend && npm run dev
#    cd frontend && npm run dev
#    cd ml-service && python run.py
#
# 6. Access:
#    - Frontend: http://localhost:3001
#    - Backend API: http://localhost:5000
#    - ML Service: http://localhost:8000
#
# PRODUCTION MODE (Docker):
# 1. Update docker-compose.yml with production secrets
# 2. Run: .\start-prod.ps1 (Windows) or ./start-prod.sh (Linux/Mac)
# 3. Access: http://localhost:3000
#
# ========================================================
