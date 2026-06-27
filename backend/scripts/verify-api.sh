#!/usr/bin/env bash
# Verify Sloth backend API — local or production.
#
# Usage:
#   ./scripts/verify-api.sh
#   ./scripts/verify-api.sh https://sloth-api.onrender.com
#   SCAN=1 ./scripts/verify-api.sh http://127.0.0.1:8000   # include Cursor scan (slow)

set -euo pipefail

BASE="${1:-http://127.0.0.1:8000}"
BASE="${BASE%/}"
SCAN="${SCAN:-0}"
SCAN_TIMEOUT="${SCAN_TIMEOUT:-120}"

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expect="$3"
  echo -n "  $name ... "
  if response=$(curl -sf -m 30 "$url" 2>/dev/null); then
    if echo "$response" | grep -q "$expect"; then
      echo "OK"
      pass=$((pass + 1))
    else
      echo "FAIL (missing: $expect)"
      echo "    $response" | head -c 200
      echo
      fail=$((fail + 1))
    fi
  else
    echo "FAIL (request error)"
    fail=$((fail + 1))
  fi
}

echo "Sloth API verification — $BASE"
echo

echo "Layer 1: health"
check "GET /health" "$BASE/health" '"status":"ok"'
check "GET /api/engine/health" "$BASE/api/engine/health" '"version"'
check "GET /api/ingest/status" "$BASE/api/ingest/status" '"cursor_configured"'
check "GET /api/watcher/status" "$BASE/api/watcher/status" '"poll_interval_seconds"'

if [[ "$SCAN" == "1" ]]; then
  echo
  echo "Layer 2: inbox scan (may take ${SCAN_TIMEOUT}s — Cursor AI)"
  echo -n "  POST /api/watcher/scan ... "
  if scan=$(curl -sf -m "$SCAN_TIMEOUT" -X POST "$BASE/api/watcher/scan" 2>/dev/null); then
    echo "OK"
    echo "    $scan" | head -c 300
    echo
    pass=$((pass + 1))
    check "GET /api/notifications" "$BASE/api/notifications" '"id"'
  else
    echo "FAIL (timeout or error — retry with SCAN_TIMEOUT=180)"
    fail=$((fail + 1))
  fi
else
  echo
  echo "Skipping scan (set SCAN=1 to run POST /api/watcher/scan)"
  check "GET /api/notifications" "$BASE/api/notifications" '\['
fi

echo
echo "Layer 3: unit tests (local only)"
if [[ "$BASE" == http://127.0.0.1:8000* ]] || [[ "$BASE" == http://localhost:8000* ]]; then
  if (cd "$(dirname "$0")/.." && SLOTH_SKIP_ENV_FILE=1 INBOX_POLL_ENABLED=false pytest -q >/dev/null 2>&1); then
    echo "  pytest -q ... OK (60 passed expected)"
    pass=$((pass + 1))
  else
    echo "  pytest -q ... FAIL"
    fail=$((fail + 1))
  fi
else
  echo "  pytest -q ... skipped (not local)"
fi

echo
echo "Result: $pass passed, $fail failed"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
