#!/usr/bin/env bash
# Start SLOTH locally — backend must already be running on port 8000.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== SLOTH local setup check ==="

if [[ ! -f backend/.env ]]; then
  echo "Missing backend/.env — copy backend/.env.example and fill CURSOR_API_KEY + IMAP_*"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example"
fi

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo ""
  echo "Backend not running. Start it in another terminal:"
  echo "  cd backend && uvicorn app.main:app --reload"
  echo ""
  exit 1
fi

echo "Backend OK"
cd backend && ./scripts/verify-api.sh
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  npm install
fi

echo ""
echo "=== Ready ==="
echo "  Backend:  http://127.0.0.1:8000"
echo "  Frontend: npm run dev  →  http://localhost:5173"
echo "  POC path: Setup → bell icon → Automate"
echo ""
echo "Optional pre-scan (30–90s): cd backend && SCAN=1 ./scripts/verify-api.sh"
echo ""
exec npm run dev
