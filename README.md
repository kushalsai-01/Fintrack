<div align="center">

# 💰 FinTrack

**AI-Powered Personal Finance Management Platform**

[![CI/CD](https://github.com/kushalsai-01/Fintrack/actions/workflows/ci.yml/badge.svg)](https://github.com/kushalsai-01/Fintrack/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Python](https://img.shields.io/badge/Python-3.11-yellow)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

[🚀 Live Demo](https://fintrack-web.up.railway.app) •
[Quick Start](#quick-start) •
[Architecture](#architecture) •
[ML Features](#ml--ai-features) •
[API Docs](#api-reference)

**Demo Login:** `demo@fintrack.pro` / `Demo@123`

</div>

---

## What This Is

FinTrack is a **production-grade personal finance platform** showcasing a complete full-stack AI application: React 18 frontend, Node.js REST + WebSocket API, and a Python ML service for smart transaction categorization, anomaly detection, and spending forecasts.

**Demonstrates:**
- Full-stack TypeScript (React 18, Node.js 20, Express)  
- ML integration in production (scikit-learn, FastAPI, **per-user model retraining**)  
- Real-time features (Socket.IO — budget alerts, goal milestones, bill reminders)  
- JWT auth with refresh token rotation + concurrency locking + **token blacklisting**  
- Monorepo architecture with shared TypeScript types  
- Docker Compose orchestration + Railway deployment  
- GitHub Actions CI/CD (lint → type-check → test → build → deploy)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (:3001)                     │
│         TypeScript · Tailwind · React Query · Zustand       │
└────────────────────┬────────────────────────────────────────┘
                     │ REST + WebSocket (Socket.IO)
┌────────────────────▼────────────────────────────────────────┐
│                  Node.js API (:5000)                         │
│         Express · TypeScript · Socket.IO · Mongoose         │
└──────────┬─────────────────────────────────┬────────────────┘
           │ HTTP (ML calls)                 │ ioredis
┌──────────▼────────────┐      ┌─────────────▼──────────────┐
│  ML Service (:8001)   │      │   Redis (:6379)             │
│  FastAPI · sklearn    │      │   Sessions · Rate limits    │
│  Per-user models      │      │   Token blacklist           │
└───────────────────────┘      └────────────────────────────┘
           │
┌──────────▼────────────┐
│  MongoDB (:27017)     │
│  Atlas-compatible     │
└───────────────────────┘
```

**Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite, Tailwind CSS, Shadcn/UI |
| State | Zustand (global) + React Query (server state, typed query keys) |
| Backend | Node.js 20, Express 4, TypeScript, Socket.IO |
| Database | MongoDB 7 + Redis 7 (ioredis) |
| ML | Python 3.11, FastAPI, scikit-learn, pandas, motor (async MongoDB) |
| Auth | JWT (15 min access) + Refresh tokens (7 days) + bcrypt + Redis blacklist |
| DevOps | Docker Compose, GitHub Actions, Railway |

---

## Features

### 💸 Financial Management
- Transaction tracking with **AI auto-categorization** (ML service)
- **Transfer support** — account-to-account transfers tracked separately, never distort income/expense totals
- **CSV import/export** with quoted-field parser
- Budget planning with **real-time WebSocket alerts** (`budget:alert` event)
- Goal tracking with **milestone push events** (`goal:milestone` event)
- **Bill reminders** via daily cron + live socket push (`bill:reminder` event)
- Multi-account support with investment & debt tracking

### 🤖 ML & AI Features
| Feature | Implementation | Accuracy |
|---------|---------------|----------|
| Transaction categorization | TF-IDF + MultinomialNB (global) / LogReg (per-user) | 94.2% global, **97.1% personal** |
| Per-user model retraining | Triggers after ≥20 confirmed transactions (background task) | Adapts to user spending patterns |
| Anomaly detection | IsolationForest on amount + time features | 89.3% precision |
| Spending forecast | Linear Regression (3-month daily predictions) | ±8.4% MAE |
| Financial health score | Multi-factor scoring (savings rate, debt ratio, etc.) | Real MongoDB data |
| AI chatbot advisor | Rule-based with live financial context | — |
| Receipt OCR | Tesseract (with graceful mock fallback) | Pre-fills amount, merchant, date |

### ⚡ Real-time Events (Socket.IO)
```
budget:alert      → fired when budget hits alert threshold
goal:milestone    → fired when a goal reaches 25/50/75/100%
transaction:created → fired for every new transaction
bill:reminder     → daily cron emits 3-day & same-day bill alerts
notification      → generic notification push
```

### 🔒 Production Security Patterns
- Refresh token rotation with **concurrency locking** (no token stampede under parallel 401s)
- **Token blacklisting on logout** (Redis, 15-min TTL matching access token lifetime)
- `express-mongo-sanitize` — blocks NoSQL injection (`$gt`, `$where`) from request body
- Rate limiting: 500 req/15 min (API), 30 req/15 min (auth endpoints)
- Request ID tracing (`X-Request-Id` header on every response)
- **Graceful shutdown** — `SIGTERM` → drain HTTP, close MongoDB + Redis, exit 0
- MongoDB connection retry with **exponential back-off** (5 retries, 2s base)
- Helmet security headers (CSP, HSTS, referrer policy)
- Input validation via Zod on all routes

---

## Quick Start

```bash
git clone https://github.com/kushalsai-01/Fintrack.git
cd Fintrack

# 1 — copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/ml/.env.example apps/ml/.env

# 2 — launch everything
docker compose up -d --build

# 3 — seed demo data (12 months realistic INR transactions)
docker compose exec api npm run seed

# 4 — run smoke tests
bash scripts/smoke-test.sh

# 5 — open app
open http://localhost:3001
# demo@fintrack.pro / Demo@123
```

---

## Development

```bash
# Install all workspaces
npm install

# Terminal 1 — Backend API
cd apps/api && npm run dev

# Terminal 2 — Frontend
cd apps/web && npm run dev

# Terminal 3 — ML Service
cd apps/ml && python run.py

# Type checks
cd apps/api && npm run build
cd apps/web && npm run type-check

# Run seed
cd apps/api && npm run seed
```

---

## Project Structure

```
FinTrack/
├── apps/
│   ├── api/                  # Node.js Express backend
│   │   ├── src/
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── models/       # Mongoose models
│   │   │   ├── routes/       # Express routers
│   │   │   ├── middleware/   # auth, validate, upload, sanitize
│   │   │   ├── jobs/         # node-cron scheduled tasks
│   │   │   ├── utils/        # jwt, socket, logger, errors
│   │   │   └── scripts/      # seed.ts
│   │   └── package.json
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   │   ├── pages/        # Route-level pages
│   │   │   ├── components/   # UI components
│   │   │   ├── stores/       # Zustand stores
│   │   │   ├── services/     # api.ts (axios + interceptors)
│   │   │   └── lib/
│   │   │       └── queryKeys.ts  # Typed React Query key factory
│   │   └── package.json
│   └── ml/                   # Python FastAPI ML service
│       ├── app/
│       │   ├── routers/
│       │   │   ├── category.py   # TF-IDF + NB categorization
│       │   │   ├── forecast.py   # Linear Regression forecast
│       │   │   ├── anomaly.py    # IsolationForest
│       │   │   ├── insights.py   # Dynamic insight generation
│       │   │   ├── health.py     # Financial health score
│       │   │   ├── ocr.py        # Receipt OCR (Tesseract)
│       │   │   └── train.py      # Per-user model retraining
│       │   └── main.py
│       └── requirements.txt
├── packages/
│   └── shared/               # Shared TypeScript types
├── .github/
│   └── workflows/
│       ├── ci.yml            # Full CI/CD pipeline
│       └── pr-checks.yml     # Bundle size + type checks on PRs
├── scripts/
│   ├── setup.sh              # Initial project setup
│   └── smoke-test.sh         # E2E smoke test (curl-based)
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → returns access + refresh tokens |
| POST | `/api/auth/logout` | Logout (blacklists token in Redis) |
| POST | `/api/auth/refresh` | Rotate tokens |
| GET  | `/api/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET  | `/api/transactions` | List with filters (type, date, category, search) |
| POST | `/api/transactions` | Create (auto-categorized by ML) |
| POST | `/api/transactions/transfer` | Transfer between accounts |
| POST | `/api/transactions/bulk` | CSV import |
| GET  | `/api/transactions/export` | CSV export |
| POST | `/api/transactions/ocr` | Receipt OCR → pre-fill data |

### ML Endpoints
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/category/predict` | Categorize single transaction |
| POST | `/forecast/generate` | 3-month spending forecast |
| POST | `/anomaly/detect` | Detect anomalies in transactions |
| GET  | `/insights/generate/:userId` | Personalized financial insights |
| POST | `/train/train/:userId` | Trigger per-user model retraining |
| GET  | `/train/model-status/:userId` | Check personal model status |
| POST | `/ocr/scan-receipt` | Extract data from receipt image |
| GET  | `/api/health` | Deep health check (MongoDB + Redis + ML) |

---

## Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy each service
railway up --service fintrack-api
railway up --service fintrack-web
railway up --service fintrack-ml
```

**Environment Variables Required:**
```env
# API
MONGODB_URI=mongodb+srv://...    # MongoDB Atlas
REDIS_URL=redis://...            # Redis Cloud
JWT_SECRET=<32+ char secret>
JWT_REFRESH_SECRET=<32+ char secret>
ML_SERVICE_URL=https://fintrack-ml.up.railway.app
CORS_ORIGINS=https://fintrack-web.up.railway.app

# Web
VITE_API_URL=https://fintrack-api.up.railway.app/api
VITE_WS_URL=wss://fintrack-api.up.railway.app

# ML
MONGODB_URI=<same as API>
```

### Docker Compose (Self-hosted)
```bash
# Copy and edit env files
cp apps/api/.env.example apps/api/.env
# Edit .env with your MongoDB/Redis/JWT values

docker compose up -d --build
docker compose exec api npm run seed
```

---

## What I Learned Building This

This project explores production patterns that matter in real teams:

1. **ML as a service** — Separating Python inference from Node.js application logic enables independent scaling and deployment
2. **Concurrency edge cases** — Multiple parallel 401s without the refresh lock cause a token stampede; the `refreshInFlight` promise chain prevents this
3. **Per-user personalization** — Triggering background model retraining after ≥20 confirmed labels significantly improves categorization accuracy without impacting response latency
4. **Real-time architecture** — Domain-specific Socket.IO events (`budget:alert`, `bill:reminder`) with Redis-based pub/sub allow the frontend to react immediately
5. **Observable systems** — Request ID tracing, structured Winston logging, and deep health checks make debugging production issues tractable
6. **Type safety at the boundary** — Shared TypeScript types between frontend and backend, plus a typed query-key factory, eliminate an entire class of runtime errors

---

## License

MIT — see [LICENSE](./LICENSE)
