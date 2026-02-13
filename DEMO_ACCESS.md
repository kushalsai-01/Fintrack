# 🚀 FinTrack Pro - Demo Access

## ✅ All Services Running Successfully!

### 🌐 Access URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend (Main App)** | http://localhost:3001 | ✅ Running |
| **Backend API** | http://localhost:5000 | ✅ Running |
| **ML Service** | http://localhost:8001 | ✅ Running |
| **API Documentation** | http://localhost:5000/api/docs | ✅ Available |
| **ML Health Check** | http://localhost:8001/health | ✅ Available |

### 🔐 Demo Login Credentials

**Pre-configured Demo Account:**
- **Email**: `demo@fintrack.pro`
- **Password**: `Demo@123`

This account has been automatically created with sample data and full permissions.

### 🎯 Google OAuth Login (Optional)

Google OAuth is also available! Click "Continue with Google" on the login page.

> **Note**: If Google OAuth is not configured with your credentials, use the demo account above.

---

## 🐳 Docker Services Status

```
✅ MongoDB       - Port 27017 - Database
✅ Redis         - Port 6379  - Cache & Sessions  
✅ Backend       - Port 5000  - Node.js API
✅ Frontend      - Port 3001  - React App
✅ ML Service    - Port 8001  - Python ML/AI
```

---

## 🧪 Testing ML Features

The ML service is running and provides:

### 1. **Category Classification**
- Automatically categorizes transactions based on description
- Test endpoint: `POST http://localhost:8001/api/ml/category/predict`

### 2. **Anomaly Detection** 
- Detects unusual spending patterns
- Test endpoint: `POST http://localhost:8001/api/ml/anomaly/detect`

### 3. **Spending Forecasting**
- Predicts future spending trends
- Test endpoint: `POST http://localhost:8001/api/ml/forecast/predict`

### 4. **Financial Insights**
- Generates AI-powered insights
- Test endpoint: `POST http://localhost:8001/api/ml/insights`

### ML Service Health
Check ML service status: http://localhost:8001/health

---

## 📊 Quick Start Guide

### Step 1: Access the App
Open your browser and go to: **http://localhost:3001**

### Step 2: Login
Use the demo credentials:
- Email: `demo@fintrack.pro`
- Password: `Demo@123`

### Step 3: Explore Features
1. **Dashboard** - View your financial overview
2. **Transactions** - Add/view transactions (ML will auto-categorize)
3. **Budgets** - Set and track budgets
4. **Goals** - Create financial goals
5. **Bills** - Track recurring bills
6. **Investments** - Monitor investment portfolio
7. **Analytics** - View AI-powered insights and forecasts
8. **Debts** - Track and manage debts

### Step 4: Test ML Features

#### Add a Transaction
When you add a transaction like "Starbucks Coffee $5.50", the ML service will:
- ✅ Automatically categorize it as "Food & Dining"
- ✅ Detect if it's an anomaly
- ✅ Update spending patterns for forecasting

#### View Insights
Go to the Analytics page to see:
- 📈 Spending forecasts for next month
- ⚠️ Anomaly alerts
- 💡 AI-generated financial advice

---

## 🔧 Useful Docker Commands

```powershell
# View all container logs
docker-compose -f fintrack-pro/docker-compose.yml logs

# View specific service logs
docker logs fintrack-backend
docker logs fintrack-frontend
docker logs fintrack-ml

# Check container status
docker ps

# Restart a service
docker restart fintrack-backend

# Stop all services
docker-compose -f fintrack-pro/docker-compose.yml down

# Start all services again
docker-compose -f fintrack-pro/docker-compose.yml up -d

# View ML service logs in real-time
docker logs -f fintrack-ml
```

---

## 🧪 Testing ML Classification

### Test via API directly:

```bash
# Category Prediction
curl -X POST http://localhost:8001/api/ml/category/predict \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Starbucks Coffee",
    "amount": 5.50,
    "merchant": "Starbucks"
  }'

# Anomaly Detection
curl -X POST http://localhost:8001/api/ml/anomaly/detect \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo_user",
    "amount": 1000,
    "category": "Shopping"
  }'
```

Or use the **built-in API documentation**:
- ML API Docs: http://localhost:8001/docs
- Backend API Docs: http://localhost:5000/api/docs

---

## 📝 Database Access (Optional)

If you need direct database access:

### MongoDB
```bash
# Connect to MongoDB
docker exec -it fintrack-mongodb mongosh -u fintrack -p fintrack123 --authenticationDatabase admin

# Use the database
use fintrack-pro

# View collections
show collections

# Query users
db.users.find().pretty()

# Query transactions
db.transactions.find().limit(5).pretty()
```

### Redis
```bash
# Connect to Redis
docker exec -it fintrack-redis redis-cli -a fintrack123

# View keys
KEYS *

# Get session data
GET sess:*
```

---

## 🚨 Troubleshooting

### Frontend not loading?
```powershell
docker logs fintrack-frontend
docker restart fintrack-frontend
```

### Backend errors?
```powershell
docker logs fintrack-backend
docker restart fintrack-backend
```

### ML service not responding?
```powershell
docker logs fintrack-ml
# Check health
curl http://localhost:8001/health
```

### Database connection issues?
```powershell
docker logs fintrack-mongodb
docker logs fintrack-redis
```

### Clear everything and restart:
```powershell
cd fintrack-pro
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## 🎉 Ready for Deployment!

This setup is production-ready and can be deployed to:
- **AWS** (EC2, ECS, or EKS)
- **Google Cloud** (GCE, Cloud Run, or GKE)
- **Azure** (VM, Container Instances, or AKS)
- **DigitalOcean** (Droplets or App Platform)
- **Any VPS** with Docker installed

For production deployment, update:
1. Environment variables in `.env`
2. Change default passwords
3. Configure SSL/TLS certificates
4. Set up domain name
5. Configure Google OAuth with production credentials

---

## 📧 Support

For issues or questions:
1. Check the logs: `docker logs <container-name>`
2. Review documentation in the `docs/` folder
3. Check API documentation at http://localhost:5000/api/docs

---

**🎊 Enjoy exploring FinTrack Pro! 🎊**

The application is ready for your demo and deployment today! 🚀
