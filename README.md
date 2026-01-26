# FinTrack Pro

A comprehensive personal finance management application with ML-powered insights and analytics.

## 🌟 Overview

FinTrack Pro is a full-stack financial tracking solution that helps you manage your money smartly with intelligent automation, real-time analytics, and AI-powered financial advice.

## 🏗️ Architecture

This is a monorepo containing three main services:

```
fintrack-pro/
├── backend/          # Node.js + Express + MongoDB API
├── frontend/         # React + TypeScript + Vite SPA
├── ml-service/       # Python FastAPI ML service
├── shared/           # Shared TypeScript types
└── docker/           # Docker configuration
```

### Tech Stack

**Frontend**
- React 18.2 + TypeScript 5.0
- Vite 5.4 for build tooling
- TailwindCSS + shadcn/ui components
- TanStack Query for data fetching
- React Hook Form + Zod validation
- Zustand for state management

**Backend**
- Node.js 20 + Express + TypeScript
- MongoDB + Mongoose ODM
- Redis for caching
- Passport.js authentication
- Winston logging
- Bull for job queues

**ML Service**
- Python 3.11 + FastAPI
- Scikit-learn for predictions
- Pandas for data processing
- Prophet for forecasting
- Anomaly detection algorithms

## 🚀 Features

### Core Features
- 💰 **Transaction Tracking** - Record income, expenses with categorization
- 📊 **Budget Management** - Set spending limits with alerts
- 🎯 **Goal Tracking** - Financial goals with progress monitoring
- 💳 **Bill Management** - Recurring bill tracking with reminders
- 📈 **Investment Portfolio** - Track stocks, crypto, real estate
- 💸 **Debt Management** - Debt payoff strategies and tracking

### Advanced Features
- 🤖 **ML-Powered Insights** - Spending pattern analysis
- 📉 **Anomaly Detection** - Unusual transaction alerts
- 🔮 **Expense Forecasting** - Predict future spending
- 📊 **Financial Health Score** - Comprehensive health metrics
- 🏷️ **Auto-Categorization** - ML categorizes transactions
- 💬 **AI Financial Advisor** - Chat-based financial guidance

## 🛠️ Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 7.0+
- Redis 7+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kushalsai-01/fintrack-pro.git
cd fintrack-pro
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file with MongoDB and Redis URLs
npm run dev
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
cp .env.example .env
# Configure API URL in .env
npm run dev
```

4. **Install ML Service Dependencies**
```bash
cd ../ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Default Ports
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:5000`
- ML Service: `http://localhost:8000`

## 📚 Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [ML Service Documentation](./ml-service/README.md)

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# ML Service tests
cd ml-service
pytest
```

## 📦 Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for production deployment guide.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Kushal Sai**  
GitHub: [@kushalsai-01](https://github.com/kushalsai-01)

## 🐛 Known Issues

See [Issues](https://github.com/kushalsai-01/fintrack-pro/issues) for active bugs and feature requests.

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Bank account integration (Plaid)
- [ ] Tax optimization recommendations
- [ ] Investment insights & portfolio rebalancing
- [ ] Social features (shared budgets, family accounts)

---

**Built with ❤️ for smarter financial management**
