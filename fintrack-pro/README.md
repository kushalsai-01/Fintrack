# FinTrack Pro - AI-Powered Personal Finance Platform

A production-grade, TypeScript-based personal finance platform with AI-powered insights, forecasting, and intelligent recommendations.

## 🚀 Features

### Core Features
- **Transaction Management** - Track income & expenses with AI category prediction
- **Budget Tracking** - Set and monitor budgets by category
- **Financial Health Score** - AI-computed wellness score (0-100)
- **Cash Flow Forecasting** - 7/14/30-day predictions
- **Goal Management** - AI-recommended financial goals
- **Smart Analytics** - Interactive charts and insights

### Premium Features ✅ IMPLEMENTED
- **Recurring Transaction Detection** - Auto-detect subscription patterns
- **Bill Reminders** - Never miss a payment with smart alerts
- **Multi-Currency Support** - Track finances in any currency
- **Investment Tracking** - Monitor stocks, crypto, ETFs
- **Debt Management** - Snowball/avalanche payoff strategies
- **Smart Alerts** - Real-time notifications via WebSocket
- **Export & Reports** - PDF/Excel/CSV financial reports
- **Gamification** - Earn achievement badges
- **Bank Integration** - Connect via Plaid API (requires API key)
- **AI Financial Advisor** - Chat interface for financial advice
- **Dark Mode** - Full dark/light/system theme support

### 🔮 Planned Features (Coming Soon)
- **Receipt Scanning & OCR** - Scan receipts to auto-create transactions (80% complete)
- **Shared Budgets** - Family/group budget management (in development)
- **Shopping Insights** - Price tracking and deal alerts
- **PWA Capabilities** - Install as native app with offline support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)            │
│                      Port 3001 (Dev) / 3000 (Prod)          │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐   │
│  │ Zustand │ │ TanStack │ │ Recharts│ │ shadcn/ui      │   │
│  │ State   │ │ Query    │ │ Charts  │ │ Components     │   │
│  └─────────┘ └──────────┘ └─────────┘ └────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│               Backend (Node.js + TypeScript)                │
│                         Port 5000                           │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐   │
│  │ Express │ │ MongoDB  │ │ Redis   │ │ Socket.IO      │   │
│  │ + Zod   │ │ Mongoose │ │ Cache   │ │ WebSocket      │   │
│  └─────────┘ └──────────┘ └─────────┘ └────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│               ML Service (Python + FastAPI)                 │
│                         Port 8000                           │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐   │
│  │ sklearn │ │ NumPy    │ │ Motor   │ │ AI Insights    │   │
│  │ Models  │ │ Pandas   │ │ MongoDB │ │ Forecasting    │   │
│  └─────────┘ └──────────┘ └─────────┘ └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
fintrack-pro/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── layout/      # Layout components
│   │   │   ├── charts/      # Chart components
│   │   │   └── features/    # Feature-specific components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # Zustand state stores
│   │   ├── services/        # API client services
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── lib/             # Library configurations
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                  # Node.js + TypeScript backend
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic layer
│   │   ├── repositories/    # Data access layer
│   │   ├── jobs/            # Background cron jobs
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── websocket/       # WebSocket handlers
│   │   └── server.ts        # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
├── ml-service/               # Python FastAPI ML service
│   ├── app/
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # ML algorithms
│   │   ├── models/          # Pydantic schemas
│   │   └── config.py        # Settings
│   ├── requirements.txt
│   └── run.py
│
├── shared/                   # Shared TypeScript types
│   └── types/
│
├── docker-compose.yml        # Docker deployment
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 6.0+
- Redis 7.0+
- Docker & Docker Compose (recommended)

### Option 1: Docker Production (Recommended)

```powershell
# 1. Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# 2. Update docker-compose.yml with your JWT secrets

# 3. Deploy (One Command!)
.\start-prod.ps1     # Windows
./start-prod.sh      # Linux/Mac

# Access: http://localhost:3000
```

### Option 2: Development Setup

```powershell
# 1. Start databases
.\start-dev.ps1      # Starts MongoDB + Redis in Docker

# 2. Install dependencies
cd backend; npm install; cd ..
cd frontend; npm install; cd ..
cd ml-service; pip install -r requirements.txt; cd ..

# 3. Setup environment files (see ENV_SETUP_GUIDE.md)
# Copy the generated JWT secrets to backend/.env

# 4. Start services (3 separate terminals)
cd backend; npm run dev        # http://localhost:5000
cd frontend; npm run dev       # http://localhost:3001
cd ml-service; python run.py   # http://localhost:8000
```

**📖 Full Setup Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

## 🔑 Environment Variables

### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGRequired Variables

**backend/.env** (CRITICAL - Must Set):
```env
# JWT Secrets (GENERATE WITH: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-generated-64-char-hex-secret
JWT_REFRESH_SECRET=your-generated-64-char-hex-secret

# Database Connections
MONGODB_URI=mongodb://localhost:27017/fintrack-pro
REDIS_URL=redis://localhost:6379
```

**frontend/.env**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_ML_URL=http://localhost:8000
```

**ml-service/.env**:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=fintrack-pro
REDIS_URL=redis://localhost:6379
```

### Optional Variables (External APIs)

```env
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Bank Integration (optional)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**📖 Complete Configuration**: See [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) for all variables and setup instructions.OST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | Login user |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Logout user |
| GET | /api/v1/auth/me | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/transactions | List transactions |
| POST | /api/v1/transactions | Create transaction |
| GET | /api/v1/transactions/:id | Get transaction |
| PUT | /api/v1/transactions/:id | Update transaction |
| DELETE | /api/v1/transactions/:id | Delete transaction |
| POST | /api/v1/transactions/scan-receipt | Scan receipt OCR |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/categories | List categories |
| POST | /api/v1/categories | Create category |
| PUT | /api/v1/categories/:id | Update category |
| DELETE | /api/v1/categories/:id | Delete category |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/analytics/monthly | Monthly summary |
| GET | /api/v1/analytics/trends | Spending trends |
| GET | /api/v1/analytics/categories | Category breakdown |

### Health Score
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health/latest | Get latest score |
| POST | /api/v1/health/compute | Compute new score |
| GET | /api/v1/health/history | Score history |

### Forecasting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/forecast/latest | Get latest forecast |
| POST | /api/v1/forecast/generate | Generate forecast |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/goals | List goals |
| POST | /api/v1/goals | Create goal |
| PUT | /api/v1/goals/:id | Update goal |
| DELETE | /api/v1/goals/:id | Delete goal |
| POST | /api/v1/goals/recommend | AI recommendations |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/budgets | List budgets |
| POST | /api/v1/budgets | Create/update budget |
| GET | /api/v1/budgets/summary | Budget summary |

### Bills & Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/bills | List bills |
| POST | /api/v1/bills | Create bill |
| PUT | /api/v1/bills/:id | Update bill |
| DELETE | /api/v1/bills/:id | Delete bill |
| POST | /api/v1/bills/:id/mark-paid | Mark as paid |

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/investments | List investments |
| POST | /api/v1/investments | Add investment |
| PUT | /api/v1/investments/:id | Update investment |
| GET | /api/v1/investments/performance | Portfolio performance |

### Debts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/debts | List debts |
| POST | /api/v1/debts | Add debt |
| PUT | /api/v1/debts/:id | Update debt |
| POST | /api/v1/debts/payoff-plan | Calculate payoff plan |

### AI Advisor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/advisor/chat | Chat with AI advisor |
| GET | /api/v1/advisor/insights | Get AI insights |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/reports/generate | Generate report |
| GET | /api/v1/reports/:id/download | Download report |

## 🧪 Testing & Quality

### Build Verification
```powershell
# ✅ Backend compiles cleanly
cd backend
npx tsc          # No errors

# ✅ Frontend builds successfully
cd frontend
npm run build    # Built in 7.19s, 1.18 MB output
```

### Code Quality
- TypeScript strict type checking
- Zod runtime validation
- ESLint code linting
- Prettier code formatting

### Security
- JWT authentication with refresh tokens
- Password hashing (bcrypt, 12 rounds)
- Rate limiting (Nginx: 10 req/s API, 5 req/m login)
- CORS configuration
- Helmet.js security headers
- Input validation (Zod schemas)
- MongoDB injection prevention
- XSS protection

## 🎨 UI/UX Features

- **Dark/Light/System Theme** - Full theme support with persistence
- **Responsive Design** - Mobile, tablet, desktop optimized
- **Interactive Charts** - Recharts visualizations
- **Real-time Updates** - WebSocket notifications
- **Accessible** - ARIA labels and keyboard navigation
- **Modern UI** - shadcn/ui components with Tailwind CSS

## 📦 Project Stats

- **Frontend**: 18+ pages, 30+ components
- **Backend**: 10 models, 12 services, 11 controllers
- **ML Service**: 6 routers with AI algorithms
- **Docker**: Production + development configurations
- **TypeScript**: Fully typed (backend + frontend)
- **Build Status**: ✅ All services compile/build successfully

## 📚 Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Quick start deployment
- [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) - Complete environment configuration
- [FEATURE_AUDIT.md](FEATURE_AUDIT.md) - Detailed feature implementation status
- API Docs - http://localhost:8000/docs (FastAPI auto-generated)

## 📄 License

MIT License - see LICENSE file for details.
