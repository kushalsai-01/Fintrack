# FinTrack — Final Verification Checklist

Run through this checklist after `docker compose up -d --build && npm run seed`.

---

## Build Verification

- [ ] `cd apps/api && npm run build` — zero TypeScript errors
- [ ] `cd apps/web && npm run type-check` — zero TypeScript errors
- [ ] `cd apps/web && npm run build` — Vite build succeeds, bundle < 5MB
- [ ] `cd apps/ml && python -m py_compile app/main.py app/routers/*.py` — no syntax errors
- [ ] `docker compose build` — all 4 images build successfully

---

## Demo Data

- [ ] `docker compose exec api npm run seed` — exits 0, logs "SEED COMPLETE"
- [ ] Dashboard shows charts with 12 months of data (not empty)
- [ ] Login with `demo@fintrack.pro` / `Demo@123` succeeds
- [ ] Transactions list shows ~250+ rows
- [ ] Budgets page shows 5 active budgets
- [ ] Goals page shows 4 active goals with progress bars

---

## Auth

- [ ] Register a new account → JWT tokens received
- [ ] Login → `rememberMe=true` stores tokens in localStorage
- [ ] `GET /api/auth/me` without token → 401
- [ ] `POST /api/auth/logout` → `GET /api/auth/me` with same token → 401 (blacklisted)
- [ ] Refresh token endpoint returns new access token

---

## Transaction Transfers

- [ ] `POST /api/transactions/transfer` with `{amount, description, date}` → 201, returns `{outgoing, incoming, transferId}`
- [ ] Both transfer legs appear in GET /transactions with `type: "transfer"`
- [ ] Dashboard income/expense totals do NOT include transfer amounts
- [ ] Analytics monthly summary excludes transfers from totals

---

## ML / AI Features

- [ ] Create a transaction without `categoryId` → ML auto-assigns a category
- [ ] `POST /ml/category/predict` with `{description:"Zomato Order", amount:350}` → predicted_category
- [ ] `POST /ml/train/train/:userId` with 20+ transactions → `status: "training_started"`
- [ ] `GET /ml/train/model-status/:userId` → `has_personal_model: false` (or true after training completes)
- [ ] Categorize endpoint returns `model_type: "global"` or `"personal"` in response
- [ ] `GET /ml/forecast/generate` → returns `predictions` array with future dates
- [ ] `GET /ml/anomaly/detect` → returns anomaly score for transactions
- [ ] AI chatbot responds to "What's my savings rate?" with data from the user's account

---

## Receipt OCR

- [ ] `POST /api/transactions/ocr` with an image file → returns `{amount, merchant, date, confidence}`
- [ ] Endpoint proxies to ML service `/ocr/scan-receipt`
- [ ] Invalid file type → 400 error with clear message

---

## Real-time WebSocket

- [ ] Connect to Socket.IO with valid JWT → socket joins `user:{id}` room
- [ ] Create a budget-breaching transaction → `budget:alert` event received by frontend
- [ ] Contribute to goal past a milestone → `goal:milestone` event
- [ ] `bill:reminder` event fires when bill is 3 days from due date (simulate cron)
- [ ] Notification bell unread count increments on each event

---

## Bill Reminders

- [ ] Bills page shows upcoming bills with due dates
- [ ] `billService.sendDueInDaysNotifications(3)` creates Notification records AND emits `bill:reminder` socket events
- [ ] Duplicate prevention: running the job twice the same day doesn't create duplicate notifications

---

## Production Hardening

- [ ] `GET /api/health` → returns `{status: "healthy", checks: {api, mongodb, redis, ml_service}}`
- [ ] Stop MongoDB → health check returns 503 with `mongodb: "error"`
- [ ] Send `{email: {"$gt": ""}}` in login body → sanitized to `_`, no MongoDB operator injection
- [ ] `SIGTERM` to API container → logs "Graceful shutdown complete", MongoDB + Redis connections close cleanly
- [ ] Restart MongoDB while API is running → API reconnects with exponential back-off

---

## Smoke Tests

```bash
# Run all automated smoke tests
bash scripts/smoke-test.sh

# Expected output: All X tests passed
```

- [ ] `smoke-test.sh` exits 0 with no failures
- [ ] All 3 Docker services healthy: `docker compose ps`

---

## CI/CD

- [ ] Push to `main` → GitHub Actions CI runs and passes all jobs
- [ ] Pull request → `pr-checks.yml` runs bundle size check and type-checks
- [ ] `deploy` job only runs on `main` branch push (not PRs)

---

## Performance

- [ ] First load (cold cache) under 3 seconds
- [ ] React Query cache prevents redundant API calls on navigation
- [ ] All useQuery calls use `queryKeys.*` factory functions (no raw string literals)

---

## Checklist Complete

When all boxes are ticked, FinTrack is production-ready. 🚀

Run `./scripts/smoke-test.sh` as a quick sanity check before any demo.
