<div align="center">
  <h1>🚀 FinTrack</h1>
  <p><strong>AI-Powered Personal Finance Management Platform</strong></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
  [![Python](https://img.shields.io/badge/Python-3.11-yellow)](https://www.python.org/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
  
  <p>A modern, full-stack financial management solution with machine learning-powered insights, real-time analytics, and intelligent financial planning.</p>
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Screenshots](#-screenshots)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [ML Features](#-ml-features)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

FinTrack is a comprehensive personal finance management platform built with modern web technologies and enhanced with artificial intelligence. It provides users with powerful tools to track expenses, manage budgets, set financial goals, and receive intelligent insights powered by machine learning.

### Key Highlights

- 💰 **Smart Transaction Management** - Automatic categorization with ML
- 📊 **Real-time Analytics** - Interactive dashboards and visualizations
- 🎯 **Goal Tracking** - Set and monitor financial goals with progress tracking
- 📱 **Responsive Design** - Works seamlessly across all devices
- 🤖 **AI-Powered Insights** - Predictive analytics and spending forecasts
- 🔒 **Secure & Private** - Bank-grade security with encrypted data
- 📈 **Investment Tracking** - Monitor portfolio performance
- 💳 **Bill Reminders** - Never miss a payment
- 🔄 **Real-time Sync** - WebSocket support for instant updates

---

## ✨ Features

### 📊 Financial Management
- **Transaction Tracking** - Record income, expenses, and transfers with detailed categorization
- **Budget Planning** - Create monthly/yearly budgets with spending alerts
- **Category Management** - Customize categories with icons and colors
- **Recurring Transactions** - Automate regular income and expenses
- **Multi-Account Support** - Manage multiple financial accounts

### 🎯 Goals & Planning
- **Financial Goals** - Set savings goals with target dates and progress tracking
- **Debt Management** - Track loans and credit card debts with payoff schedules
- **Bill Reminders** - Schedule recurring bills with notifications
- **Investment Portfolio** - Monitor stocks, mutual funds, and other investments

### 🤖 AI & Analytics
- **Smart Categorization** - ML-powered automatic transaction categorization
- **Spending Insights** - Identify patterns and anomalies in spending behavior
- **Budget Forecasting** - Predict future expenses based on historical data
- **Financial Health Score** - Comprehensive financial wellness assessment
- **Anomaly Detection** - Detect unusual transactions and potential fraud

### 📈 Reporting & Visualization
- **Interactive Dashboards** - Real-time financial overview
- **Custom Reports** - Generate detailed financial reports
- **Trend Analysis** - Visualize spending trends over time
- **Export Data** - Download reports in CSV/PDF formats

### 🔔 Notifications
- **Bill Reminders** - Get notified before bills are due
- **Budget Alerts** - Warnings when approaching budget limits
- **Goal Milestones** - Celebrate achieving financial goals
- **Weekly/Monthly Reports** - Email summaries of financial activity

---

## 🏗️ Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser] -->|HTTPS| B[Nginx]
        C[Mobile Browser] -->|HTTPS| B
    end
    
    subgraph "Application Layer"
        B --> D[React Frontend]
        D -->|REST API| E[Node.js Backend]
        E -->|WebSocket| D
    end
    
    subgraph "Service Layer"
        E -->|HTTP| F[ML Service]
        E -->|Query| G[(MongoDB)]
        E -->|Cache| H[(Redis)]
    end
    
    subgraph "ML Layer"
        F -->|Predict| I[Category Model]
        F -->|Detect| J[Anomaly Model]
        F -->|Forecast| K[Prediction Model]
    end
    
    style D fill:#61dafb
    style E fill:#68a063
    style F fill:#ffd43b
    style G fill:#47a248
    style H fill:#dc382d
```

### Monorepo Structure

```
FinTrack/
├── apps/
│   ├── api/                    # Backend API Service
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── models/         # MongoDB schemas
│   │   │   ├── routes/         # API routes
│   │   │   ├── middleware/     # Auth, validation
│   │   │   ├── utils/          # Helper functions
│   │   │   └── config/         # Configuration
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                    # Frontend Application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── stores/         # State management
│   │   │   ├── services/       # API clients
│   │   │   └── lib/            # Utilities
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── ml/                     # ML Service
│       ├── app/
│       │   ├── routers/        # FastAPI routes
│       │   ├── models/         # ML models
│       │   └── config.py       # Configuration
│       ├── Dockerfile
│       └── requirements.txt
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── types/
│
├── infra/
│   ├── docker/                 # Docker configurations
│   │   ├── mongo-init.js       # MongoDB initialization
│   │   └── nginx.conf          # Nginx configuration
│   └── ci/                     # CI/CD workflows
│       └── .github/workflows/
│
├── docker-compose.yml          # Container orchestration
├── .gitignore
└── README.md
```

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant M as ML Service
    participant D as Database
    
    U->>F: Add Transaction
    F->>A: POST /api/transactions
    A->>M: Predict Category
    M-->>A: Category (95% confidence)
    A->>D: Save Transaction
    D-->>A: Success
    A->>F: Transaction + Category
    F-->>U: Update UI
    
    Note over A,M: ML categorization happens<br/>automatically for new transactions
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis
    participant D as Database
    
    C->>A: POST /api/auth/login
    A->>D: Verify Credentials
    D-->>A: User Data
    A->>A: Generate JWT Tokens
    A->>R: Store Refresh Token
    A-->>C: Access & Refresh Tokens
    
    Note over C,A: Access Token (15min)<br/>Refresh Token (30 days)
    
    C->>A: API Request + Token
    A->>A: Verify JWT
    A-->>C: Protected Resource
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** Shadcn/UI + Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Icons:** Lucide React
- **Date Handling:** date-fns

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB 7.0 with Mongoose ODM
- **Cache:** Redis 7
- **Authentication:** JWT (jsonwebtoken) + Passport.js
- **Validation:** Zod
- **File Upload:** Multer
- **WebSocket:** Socket.io
- **Logging:** Winston

### ML Service
- **Language:** Python 3.11
- **Framework:** FastAPI
- **ML Libraries:** 
  - scikit-learn (Classification, Regression)
  - pandas (Data processing)
  - numpy (Numerical computing)
- **Rate Limiting:** slowapi
- **Validation:** Pydantic

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx (Frontend)
- **CI/CD:** GitHub Actions
- **Process Manager:** PM2 (production)
- **API Documentation:** OpenAPI/Swagger

### Development Tools
- **Package Manager:** npm (Node.js), pip (Python)
- **Linting:** ESLint, Prettier
- **Type Checking:** TypeScript compiler
- **Testing:** Jest, React Testing Library
- **Git Hooks:** Husky (optional)

---

## 📸 Screenshots

### Dashboard
![Dashboard Overview](./screenshots/dashboard.png)
*Real-time financial overview with key metrics and recent transactions*

### Transactions
![Transaction Management](./screenshots/transactions.png)
*Manage all your transactions with powerful filtering and search*

### Budgets
![Budget Planning](./screenshots/budgets.png)
*Create and track budgets with visual progress indicators*

### Analytics
![Financial Analytics](./screenshots/analytics.png)
*Detailed insights and spending trends*

### Goals
![Financial Goals](./screenshots/goals.png)
*Set and monitor your financial goals*

### AI Insights
![ML-Powered Insights](./screenshots/insights.png)
*Smart recommendations powered by machine learning*

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Git installed
- 8GB RAM minimum
- 10GB free disk space

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/kushalsai-01/Fintrack.git
cd Fintrack

# Start all services
docker-compose up -d --build

# Wait ~30 seconds for services to initialize

# Open in browser
open http://localhost:3001
```

### Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3001 | Web application |
| **Backend API** | http://localhost:5000 | REST API |
| **ML Service** | http://localhost:8001 | Machine learning endpoints |
| **API Health** | http://localhost:5000/api/health | Health check |

### Demo Credentials

```
Email:    demo@fintrack.pro
Password: Demo@123
```

---

## 💻 Installation

### Option 1: Docker (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/kushalsai-01/Fintrack.git
cd Fintrack

# 2. Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://fintrack:fintrack123@mongodb:27017/fintrack?authSource=admin
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=http://localhost:3001
ML_SERVICE_URL=http://ml-service:8000
EOF

# 3. Start services
docker-compose up -d --build

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

### Option 2: Local Development

#### Backend Setup

```bash
cd apps/api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run migrate

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

#### Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

#### ML Service Setup

```bash
cd apps/ml

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start service
python run.py
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "eyJhbG..."
    }
  }
}
```

### Transaction Endpoints

#### Get Transactions
```http
GET /api/transactions?page=1&limit=10&type=expense&dateRange=month
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "transactions": [...],
    "total": 145,
    "page": 1,
    "totalPages": 15
  }
}
```

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "expense",
  "amount": 50.00,
  "categoryId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "description": "Grocery shopping",
  "date": "2026-02-13T00:00:00Z",
  "notes": "Weekly groceries"
}
```

### Budget Endpoints

#### Get Budgets
```http
GET /api/budgets
Authorization: Bearer {accessToken}
```

#### Create Budget
```http
POST /api/budgets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Monthly Groceries",
  "categoryId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "amount": 500,
  "period": "monthly",
  "startDate": "2026-02-01",
  "alertThreshold": 80
}
```

### Analytics Endpoints

#### Get Dashboard Data
```http
GET /api/analytics/dashboard
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "totalBalance": 15000.00,
    "monthlyIncome": 5000.00,
    "monthlyExpenses": 3200.00,
    "savingsRate": 36.0,
    "recentTransactions": [...],
    "categoryBreakdown": {...}
  }
}
```

#### Get Financial Health Score
```http
GET /api/analytics/health
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "score": 78,
    "factors": {
      "savingsRate": 85,
      "debtRatio": 60,
      "budgetAdherence": 90
    },
    "recommendations": [...]
  }
}
```

---

## 🤖 ML Features

### Transaction Categorization

The ML service automatically categorizes transactions based on description and merchant data.

```python
# Endpoint: POST /categorize
{
  "transactions": [
    {
      "description": "Starbucks Coffee",
      "merchant": "Starbucks",
      "amount": 5.50
    }
  ]
}

# Response
{
  "predictions": [
    {
      "category": "Food & Dining",
      "confidence": 0.95,
      "alternatives": [
        {"category": "Entertainment", "confidence": 0.03}
      ]
    }
  ]
}
```

### Spending Forecast

Predicts future spending based on historical patterns.

```python
# Endpoint: POST /forecast
{
  "transactions": [...],
  "months_ahead": 3
}

# Response
{
  "forecast": [
    {"month": "2026-03", "predicted_amount": 3200.50},
    {"month": "2026-04", "predicted_amount": 3150.75},
    {"month": "2026-05", "predicted_amount": 3300.25}
  ]
}
```

### Anomaly Detection

Identifies unusual transactions that deviate from normal spending patterns.

```python
# Endpoint: POST /anomaly/detect
{
  "transactions": [...],
  "threshold": 0.8
}

# Response
{
  "anomalies": [
    {
      "transaction_id": "...",
      "anomaly_score": 0.92,
      "reason": "Amount significantly higher than usual"
    }
  ]
}
```

---

## 🔧 Development

### Project Setup

```bash
# Install dependencies for all workspaces
npm install

# Build shared packages
cd packages/shared && npm run build

# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

### Running Services Individually

```bash
# Backend (Terminal 1)
cd apps/api
npm run dev

# Frontend (Terminal 2)
cd apps/web
npm run dev

# ML Service (Terminal 3)
cd apps/ml
source venv/bin/activate
python run.py
```

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fintrack
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8001
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

---

## 🧪 Testing

### Backend Tests

```bash
cd apps/api

# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Frontend Tests

```bash
cd apps/web

# Component tests
npm run test

# E2E tests
npm run test:e2e
```

---

## 🚀 Deployment

### Docker Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start services
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Manual Deployment

1. **Build Frontend**
```bash
cd apps/web
npm run build
# Output in dist/
```

2. **Build Backend**
```bash
cd apps/api
npm run build
# Output in dist/
```

3. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name yourapp.com;
    
    location / {
        root /var/www/fintrack;
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

### Environment Setup

For production, ensure you:
- Use strong JWT secrets
- Enable HTTPS
- Set up firewall rules
- Configure backup strategy
- Enable monitoring and logging
- Use managed database services
- Implement rate limiting

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
```bash
git clone https://github.com/kushalsai-01/Fintrack.git
cd Fintrack
```

2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
- Follow existing code style
- Add tests for new features
- Update documentation

4. **Commit your changes**
```bash
git commit -m "Add amazing feature"
```

5. **Push to your fork**
```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request**

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Write meaningful commit messages
- Add JSDoc comments for functions
- Keep functions small and focused

### Testing Guidelines

- Write unit tests for business logic
- Add integration tests for API endpoints
- Ensure >80% code coverage
- Test edge cases and error handling

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Kushal Sai**
- GitHub: [@kushalsai-01](https://github.com/kushalsai-01)
- Project: [FinTrack](https://github.com/kushalsai-01/Fintrack)

---

## 🙏 Acknowledgments

- React team for the amazing framework
- FastAPI for the intuitive Python framework
- MongoDB for the flexible database
- All open-source contributors

---

## 📞 Support

For support, email support@fintrack.com or open an issue on GitHub.

---

<div align="center">
  <p>Made with ❤️ by Kushal Sai</p>
  <p>⭐ Star this repository if you found it helpful!</p>
</div>
