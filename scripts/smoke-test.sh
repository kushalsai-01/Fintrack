#!/bin/bash
# FinTrack E2E Smoke Test
# Run after: docker compose up -d --build
# Usage: ./scripts/smoke-test.sh [BASE_URL] [ML_BASE_URL]
#
# Examples:
#   ./scripts/smoke-test.sh                                  # local defaults
#   BASE_URL=https://api.fintrack.pro ./scripts/smoke-test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000/api}"
ML_BASE="${ML_BASE_URL:-http://localhost:8001}"
PASS=0
FAIL=0
SKIP=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✅${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}❌${NC} $1"; FAIL=$((FAIL+1)); }
skip() { echo -e "  ${YELLOW}⏭️${NC}  $1 (skipped)"; SKIP=$((SKIP+1)); }

check_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$name"
  else
    fail "$name (expected HTTP $expected, got $actual)"
  fi
}

json_field() {
  # Extract a JSON field value using python3
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$2)" 2>/dev/null || echo ""
}

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       FinTrack E2E Smoke Tests                       ║"
echo "║       API: $BASE_URL"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Health Checks ────────────────────────────────────────────────────────────
echo "── Health checks ──────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/health" 2>/dev/null || echo "000")
check_status "GET /api/health → 200" "200" "$STATUS"

HEALTH_BODY=$(curl -s --max-time 5 "$BASE_URL/health" 2>/dev/null || echo "{}")
MONGO_STATUS=$(json_field "$HEALTH_BODY" "['checks']['mongodb']")
[ "$MONGO_STATUS" = "ok" ] && pass "MongoDB check = ok" || fail "MongoDB check = $MONGO_STATUS"

ML_STATUS_FROM_API=$(json_field "$HEALTH_BODY" "['checks']['ml_service']")
[ "$ML_STATUS_FROM_API" = "ok" ] && pass "ML service check via API = ok" || skip "ML service check via API = $ML_STATUS_FROM_API (ML may not be running)"

# ── Auth Flow ─────────────────────────────────────────────────────────────────
echo ""
echo "── Auth flow ───────────────────────────────────────────────"

# Register test user
TEST_EMAIL="smoketest_$(date +%s)@fintrack.pro"
TEST_PASS="Test@1234!"

REGISTER_BODY=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"firstName\":\"Smoke\",\"lastName\":\"Test\"}" \
  --max-time 10 2>/dev/null || echo "{}")

REG_SUCCESS=$(json_field "$REGISTER_BODY" "['success']")
[ "$REG_SUCCESS" = "True" ] && pass "POST /auth/register → success" || fail "POST /auth/register failed: $(json_field "$REGISTER_BODY" "['error']")"

# Login
LOGIN_BODY=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" \
  --max-time 10 2>/dev/null || echo "{}")

ACCESS_TOKEN=$(json_field "$LOGIN_BODY" "['data']['tokens']['accessToken']")
REFRESH_TOKEN=$(json_field "$LOGIN_BODY" "['data']['tokens']['refreshToken']")

[ -n "$ACCESS_TOKEN" ] && pass "POST /auth/login → token received" || fail "POST /auth/login → no token"

if [ -z "$ACCESS_TOKEN" ]; then
  fail "Cannot continue without auth token"
  echo ""
  echo "─────────────────────────────────────────────────────────"
  echo -e "Results: ${GREEN}✅ $PASS passed${NC} | ${RED}❌ $FAIL failed${NC} | ${YELLOW}⏭️  $SKIP skipped${NC}"
  exit 1
fi

# Get current user
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /auth/me (authenticated) → 200" "200" "$STATUS"

# Protected route without token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/me" --max-time 5 2>/dev/null || echo "000")
check_status "GET /auth/me (no token) → 401" "401" "$STATUS"

# Token refresh
if [ -n "$REFRESH_TOKEN" ]; then
  REFRESH_BODY=$(curl -s -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    --max-time 10 2>/dev/null || echo "{}")
  NEW_TOKEN=$(json_field "$REFRESH_BODY" "['data']['tokens']['accessToken']")
  [ -n "$NEW_TOKEN" ] && pass "POST /auth/refresh → new token" || fail "POST /auth/refresh failed"
  ACCESS_TOKEN="${NEW_TOKEN:-$ACCESS_TOKEN}"
fi

# ── Transactions ──────────────────────────────────────────────────────────────
echo ""
echo "── Transactions ────────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /transactions → 200" "200" "$STATUS"

TODAY=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python3 -c "from datetime import datetime; print(datetime.utcnow().isoformat()+'Z')")
CREATE_BODY=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"expense\",\"amount\":500,\"description\":\"Smoke test transaction\",\"date\":\"$TODAY\"}" \
  --max-time 10 2>/dev/null || echo "{}")

TX_ID=$(json_field "$CREATE_BODY" "['data']['transaction']['id']" 2>/dev/null || json_field "$CREATE_BODY" "['data']['transaction']['_id']")
[ -n "$TX_ID" ] && pass "POST /transactions → created (id=$TX_ID)" || fail "POST /transactions failed: $(json_field "$CREATE_BODY" "['error']")"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/transactions/export" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 10 2>/dev/null || echo "000")
check_status "GET /transactions/export → 200" "200" "$STATUS"

# ── Budgets ────────────────────────────────────────────────────────────────────
echo ""
echo "── Budgets ─────────────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/budgets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /budgets → 200" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/budgets/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /budgets/status → 200" "200" "$STATUS"

# ── Goals ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Goals ───────────────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/goals" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /goals → 200" "200" "$STATUS"

# ── Analytics ─────────────────────────────────────────────────────────────────
echo ""
echo "── Analytics ───────────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/analytics/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 10 2>/dev/null || echo "000")
check_status "GET /analytics/dashboard → 200" "200" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/analytics/monthly" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 10 2>/dev/null || echo "000")
check_status "GET /analytics/monthly → 200" "200" "$STATUS"

# ── Bills ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Bills ───────────────────────────────────────────────────"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/bills" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /bills → 200" "200" "$STATUS"

# ── Logout (token blacklist) ──────────────────────────────────────────────────
echo ""
echo "── Logout & token blacklist ────────────────────────────────"

LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "POST /auth/logout → 200" "200" "$LOGOUT_STATUS"

# After logout the same token should be rejected
REVOKED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" --max-time 5 2>/dev/null || echo "000")
check_status "GET /auth/me after logout → 401" "401" "$REVOKED_STATUS"

# ── ML Service ────────────────────────────────────────────────────────────────
echo ""
echo "── ML Service ──────────────────────────────────────────────"

ML_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$ML_BASE/health" 2>/dev/null || echo "000")
if [ "$ML_HEALTH" = "200" ]; then
  pass "GET /health (ML) → 200"

  CAT_BODY=$(curl -s -X POST "$ML_BASE/category/predict" \
    -H "Content-Type: application/json" \
    -d '{"description":"Starbucks Coffee Latte","amount":350}' \
    --max-time 10 2>/dev/null || echo "{}")
  HAS_PRED=$(json_field "$CAT_BODY" "['success']")
  [ "$HAS_PRED" = "True" ] && pass "POST /category/predict → success" || fail "POST /category/predict failed"

  TRAIN_BODY=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$ML_BASE/train/model-status/demo_user" --max-time 5 2>/dev/null || echo "000")
  check_status "GET /train/model-status/:id → 200" "200" "$TRAIN_BODY"
else
  skip "ML service not reachable at $ML_BASE — skipping ML tests"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────────"
TOTAL=$((PASS+FAIL+SKIP))
echo -e "Results ($TOTAL tests): ${GREEN}✅ $PASS passed${NC} | ${RED}❌ $FAIL failed${NC} | ${YELLOW}⏭️  $SKIP skipped${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Some tests failed. Check logs: docker compose logs${NC}"
  exit 1
else
  echo -e "${GREEN}All smoke tests passed! FinTrack is healthy.${NC}"
  exit 0
fi
