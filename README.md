# FinTrack

Personal finance platform with ML-powered insights.

## Architecture

```
fintrack/
├── apps/
│   ├── web/          # React + TypeScript frontend
│   ├── api/          # Node.js + Express backend
│   └── ml/           # Python + FastAPI ML service
├── packages/
│   └── shared/       # Shared TypeScript types
├── infra/
│   ├── docker/       # Docker configs (nginx, mongo-init)
│   └── ci/           # CI/CD workflows
├── docker-compose.yml
└── .env
```

## Quick Start

```bash
# Start all services
docker-compose up -d --build

# Access
# Web:     http://localhost:3001
# API:     http://localhost:5000
# ML:      http://localhost:8001
```

## Services

| Service  | Tech Stack                  | Port |
|----------|-----------------------------|------|
| Web      | React, TypeScript, Vite     | 3001 |
| API      | Node.js, Express, MongoDB   | 5000 |
| ML       | Python, FastAPI, scikit-learn| 8001 |
| MongoDB  | MongoDB 7.0                 | 27017|
| Redis    | Redis 7                     | 6379 |

## Development

```bash
# API (backend)
cd apps/api && npm install && npm run dev

# Web (frontend)
cd apps/web && npm install && npm run dev

# ML service
cd apps/ml && pip install -r requirements.txt && python run.py
```

## Demo Credentials

```
Email:    demo@fintrack.pro
Password: Demo@123
```
