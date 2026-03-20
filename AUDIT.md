# FinTrack Audit (Phase 0)

This file is generated from an initial repository scan to support the required production audit + implementation plan.

## Broken imports
- None found by static scan of the current TypeScript/route import graph.

## TODO / unimplemented functions
### ML service placeholders / simulated logic
- `apps/ml/app/routers/forecast.py`
  - `generate_forecast`: uses a *simulated forecast* (randomness/trend) rather than a real trained ML model.
- `apps/ml/app/routers/anomaly.py`
  - `detect_anomalies`: uses a simple heuristic (comment indicates replacement with Isolation Forest).
  - `get_recent_anomalies`: returns an empty/placeholder anomalies list and message.
- `apps/ml/app/routers/category.py`
  - `predict_category` / `predict_single_category`: uses keyword-based categorization rather than ML.
  - `train_category_model`: returns a placeholder “training initiated/processing” response (no real training).
- `apps/ml/app/routers/health.py`
  - `get_user_health`: uses demo/sample metrics instead of DB-backed computation.
  - `get_health_history`: returns sample/mock time series rather than DB-backed history.
- `apps/ml/app/routers/ocr.py`
  - OCR includes a fallback mock mode when Tesseract is missing (warn + embedded sample grocery text).
  - Contains a `pass` in a code path (unimplemented or intentionally empty behavior).

### Frontend stubbed handlers
- `apps/web/src/pages/Insights.tsx`
  - `handleSaveInsight`: stubbed (does not call any API to persist the “saved” state).
  - `handleFeedback`: stubbed (does not call any API to record helpful/unhelpful feedback).

## Missing env variables
Based on `apps/api/src/utils/envValidation.ts` (Zod schema) the following variables are required and will fail startup in production if missing/invalid:
- `MONGODB_URI` (required)
- `REDIS_URL` (required)
- `JWT_SECRET` (required, must be at least 32 chars)
- `JWT_REFRESH_SECRET` (required, must be at least 32 chars)

Note: optional integrations (OAuth/SMTP/Plaid/etc.) are not required, but may be disabled if missing.

## API endpoints defined in routes but missing controller implementation
- None found by initial scan (route mount files appear to import valid route modules/controllers/services for mounted endpoints).

## Frontend pages/components rendering placeholder or empty state
- `apps/web/src/pages/Dashboard.tsx`
  - Financial health card fallback copy: uses `healthScore?.explanation || 'Compute your health score to see insights'` if explanation is absent.
- `apps/web/src/pages/Insights.tsx`
  - Empty state: “No insights found” rendered when `otherInsights` is empty.
- `apps/web/src/pages/Transactions.tsx`
  - Empty state: “No transactions found” when the transactions array is empty.
- `apps/web/src/pages/Reports.tsx`
  - Empty state: “No reports yet” when the reports list is empty.
- `apps/web/src/pages/Categories.tsx`
  - Empty state: “No categories found” when filtered categories length is 0.

## ML endpoints defined but not wired to the frontend (or not called by API)
### Not proxied / not exposed via API layer
The backend only mounts ML proxy routes for `/forecast/*` and `/insights/*` under `apps/api/src/routes/index.ts`.
ML routes that exist in the ML service but are not exposed via API routes:
- `/category/*`
- `/anomaly/*`
- `/ocr/*`
- `/goals/*`
- `/financial-health/*` (ML exists, API health routes compute separately)

### Forecast wiring mismatch (request/shape mismatch)
- Resolved: backend now sends `horizon_days` when calling ML `/forecast/balance`.

### Insights wiring mismatch (API/Frontend shape alignment)
- Resolved: `/api/insights` now calls ML with the boolean switches (`include_*`) and maps ML insights into the shape expected by the React Insights page (safe `type`/`priority` fields, plus `stats`).
- Note: ML still does not return a `recommendations` field; the UI currently does not depend on it.

### ML health endpoint mismatch
- ML exposes financial health under prefix `/financial-health`
- Backend helper uses `/health/${userId}` path (likely incorrect if used later)
- Also, API `/api/analytics/health` appears to call internal analytics computation, not ML service.

## Extra notes (not part of the required lists)
- `docker-compose.yml` currently does not match the requested healthcheck and security constraints:
  - MongoDB/Redis healthcheck intervals, timeouts, and retries have been aligned to `interval: 30s, timeout: 10s, retries: 3`.
  - MongoDB and Redis credentials are now sourced from env vars (no hardcoded secrets).
  - Compose now includes an outer `nginx` reverse-proxy service wired to `infra/docker/nginx.conf`.

