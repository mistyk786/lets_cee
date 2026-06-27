# Backend deployment guide

Deploy the Sloth FastAPI backend to a public URL (Render/Railway) with Gmail IMAP + Cursor AI.

---

## Repository file map

```text
backend/
  app/
    main.py                     # FastAPI app, CORS, lifespan → inbox watcher
    config.py                   # Env settings (Cursor, IMAP, CORS_ORIGINS)
    engine.py                   # SlothEngine facade — workflow AI + scoring
    schemas.py                  # Pydantic contracts (DetectedWorkflow, etc.)
    models.py                   # API response models (NotificationItem, etc.)
    constants.py                # Defaults (models, poll intervals)
    routers/
      demo.py                   # GET /api/demo-data
      analysis.py               # POST /api/analyse-workflow, forecast, etc.
      activation.py             # POST /api/activate-automation
      notifications.py          # Watcher + notifications + automate
      ingestion.py              # GET /api/ingest/status, email/calendar upload
    services/
      cursor_service.py         # Cursor Cloud Agents REST API (workflow JSON)
      workflow_service.py       # Prompt + validate DetectedWorkflow
      imap_service.py           # Gmail IMAP fetch (batched headers, ~5s)
      ingestion_service.py      # Source priority: upload → IMAP → demo
      inbox_watcher.py          # Background thread, poll every 120s
      prototype_service.py      # Notifications + automate pipeline
      analysis_service.py       # Wraps SlothEngine for HTTP layer
      activation_service.py     # Draft reply, slots, tentative event
      calendar_service.py       # find_available_slots() pure functions
      email_normaliser.py       # Flat emails → ordered threads
      dataset_service.py        # Load demo_emails.json / demo_calendar.json
      demo_data.py              # Bundled demo workflow fallback
      fallback.py               # On-disk cache fallback (data/cache/)
  data/
    demo_emails.json            # 60 demo emails
    demo_calendar.json          # 20 demo events
    cache/                      # Pre-generated fallback fixtures
  scripts/
    verify-api.sh               # curl + pytest verification script
  tests/                        # 60 tests — pytest -q
  requirements.txt
  .env.example                  # Copy to .env (gitignored)
render.yaml                     # Render Blueprint (repo root)
```

---

## Environment variables

Copy `backend/.env.example` → `backend/.env`. **Never commit `.env`.**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CURSOR_API_KEY` | Yes (live AI) | — | Cursor API key from [Integrations](https://cursor.com/dashboard/integrations) |
| `CURSOR_MODEL` | No | `composer-2.5` | Cursor agent model |
| `CURSOR_TIMEOUT_SECONDS` | No | `120` | Max wait per Cursor agent run |
| `CURSOR_POLL_INTERVAL_SECONDS` | No | `2` | Poll interval inside Cursor client |
| `IMAP_HOST` | Yes (live Gmail) | — | `imap.gmail.com` |
| `IMAP_PORT` | No | `993` | IMAP SSL port |
| `IMAP_USER` | Yes (live Gmail) | — | Gmail address |
| `IMAP_PASSWORD` | Yes (live Gmail) | — | 16-char Gmail **app password** (spaces OK) |
| `IMAP_MAILBOX` | No | `INBOX` | Mailbox to scan |
| `IMAP_MAX_MESSAGES` | No | `80` | Recent messages to inspect |
| `INBOX_POLL_ENABLED` | No | `true` | Background watcher on/off |
| `INBOX_POLL_INTERVAL_SECONDS` | No | `120` | Watcher poll interval |
| `CORS_ORIGINS` | Prod | — | Comma-separated frontend URLs (see below) |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `SLOTH_ENV` | No | `development` | `production` on deploy |

Legacy: `OPENAI_API_KEY` is accepted as an alias for `CURSOR_API_KEY`.

### Gmail IMAP setup (step by step)

1. **Enable IMAP:** Gmail → Settings → See all settings → **Forwarding and POP/IMAP** → Enable IMAP → Save.
2. **2-Step Verification:** [Google Account → Security](https://myaccount.google.com/security) → turn on 2-Step Verification.
3. **App password:** Security → **App passwords** → select app "Mail" → generate.
4. Copy the 16-character password into `IMAP_PASSWORD` (with or without spaces).
5. Set `IMAP_USER` to the Gmail address and `IMAP_HOST=imap.gmail.com`.
6. Restart uvicorn after changing `.env`.

Quick test:

```bash
python3 -c "
import imaplib
c = imaplib.IMAP4_SSL('imap.gmail.com', 993)
c.login('YOUR@gmail.com', 'YOUR_APP_PASSWORD_NO_SPACES')
print('IMAP OK')
c.logout()
"
```

### CORS for production frontend

After deploying the Vite app (e.g. `https://sloth.vercel.app`), set in Render dashboard:

```bash
CORS_ORIGINS=https://sloth.vercel.app
```

Multiple origins:

```bash
CORS_ORIGINS=https://sloth.vercel.app,https://sloth-staging.vercel.app
```

Local Vite ports (`5173`, `5174`) are **always** allowed. Production URLs are merged in via `CORS_ORIGINS`.

Implementation in [`backend/app/main.py`](../backend/app/main.py):

```python
_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Render deployment

### Option A — Blueprint (`render.yaml` at repo root)

1. Render Dashboard → **New** → **Blueprint** → connect `mistyk786/lets_cee`.
2. Set secret env vars in dashboard after create:
   - `CURSOR_API_KEY`
   - `IMAP_USER`
   - `IMAP_PASSWORD`
   - `CORS_ORIGINS` (frontend URL)
3. Deploy. Note the service URL: `https://sloth-api.onrender.com`.

### Option B — Manual Web Service

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |
| Python version | 3.11+ |

**Cold start:** Render free tier sleeps after idle. Run `POST /api/watcher/scan` to wake before demos.

---

## API contracts (watcher + notifications)

### `GET /health`

Liveness probe for Render.

```json
{ "status": "ok" }
```

### `GET /api/engine/health`

SlothEngine readiness.

```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "production",
  "cursor_configured": true,
  "openai_configured": true,
  "demo_available": true,
  "message": "Cursor configured. Live workflow extraction available."
}
```

### `GET /api/ingest/status`

```json
{
  "cursor_configured": true,
  "imap_configured": true,
  "uploaded_emails": false,
  "uploaded_calendar": false,
  "demo_available": true,
  "alternatives_to_gmail_api": ["IMAP with an app password...", "..."]
}
```

### `GET /api/watcher/status`

```json
{
  "enabled": true,
  "running": true,
  "poll_interval_seconds": 120,
  "last_scan_at": "2026-06-27T06:13:24.863693+00:00",
  "next_scan_in_seconds": 87.4,
  "last_error": null,
  "notification_count": 2,
  "data_source": "imap",
  "initial_scan_done": true,
  "pending_email_subject": "Quick sync next week?"
}
```

### `POST /api/watcher/scan`

Triggers immediate inbox scan + Cursor analysis. **30–90 seconds typical.**

Response `200`:

```json
{
  "data_source": "imap",
  "demo_mode": false,
  "new_messages": 0,
  "analyzed": true,
  "notification_count": 2,
  "workflow_name": "External Event Registration Approval and Pre-Event Reminders"
}
```

Response `502` if scan throws (check logs).

### `POST /api/prototype/bootstrap`

Manual bootstrap (same scan logic, returns full bootstrap shape).

```json
{
  "workflow_name": "Email-to-Calendar Meeting Scheduling",
  "opportunity_score": 78.5,
  "demo_mode": false,
  "data_source": "imap",
  "notifications": [ "...NotificationItem[]..." ]
}
```

### `GET /api/notifications`

```json
[
  {
    "id": "n-incoming-scheduling",
    "title": "New scheduling email — automate reply?",
    "message": "Sender asked to \"Subject\". Sloth scored this workflow 78/100...",
    "created_at": "2026-06-27T06:13:24.863693+00:00",
    "read": false,
    "opportunity_id": "internal-meeting-scheduling",
    "recoverable_minutes_per_week": 165,
    "action": "automate",
    "status": "pending"
  },
  {
    "id": "n-workflow-detected",
    "title": "Repeated workflow detected",
    "message": "Found \"Workflow Name\" (47 runs)...",
    "action": "review",
    "status": "pending"
  }
]
```

### `GET /api/notifications/{notification_id}`

Single `NotificationItem`. `404` if unknown.

### `POST /api/notifications/{notification_id}/automate`

Runs activation for `action: "automate"` notifications.

```json
{
  "notification": {
    "id": "n-incoming-scheduling",
    "status": "completed",
    "read": true
  },
  "activation": {
    "rules": {
      "internal_contacts_only": true,
      "meeting_duration_minutes": 30,
      "working_hours_start": "09:00",
      "working_hours_end": "18:00",
      "approval_required": true,
      "max_slots_proposed": 3
    },
    "processed_email_subject": "Quick sync next week?",
    "draft_reply": "Hi,\n\nThanks for the note. Here are a few times that work:\n- ...",
    "proposed_slots": [
      {
        "start_time": "2026-06-29T09:00:00+00:00",
        "end_time": "2026-06-29T09:30:00+00:00"
      }
    ],
    "tentative_event": {
      "event_id": "evt-abc123",
      "title": "Quick sync next week?",
      "start_time": "2026-06-29T09:00:00+00:00",
      "end_time": "2026-06-29T09:30:00+00:00",
      "attendees": ["sender@example.com", "you@gmail.com"],
      "status": "tentative"
    },
    "run": {
      "run_id": "run-xyz",
      "activated_at": "2026-06-27T06:13:43.797393+00:00",
      "email_subject": "Quick sync next week?",
      "proposed_slot_count": 3,
      "created_event_id": "evt-abc123",
      "status": "completed"
    }
  }
}
```

Nothing is sent to Gmail or Google Calendar — draft-for-approval only.

---

## Verification script

```bash
cd backend
chmod +x scripts/verify-api.sh

# Quick checks (local)
./scripts/verify-api.sh

# Production
./scripts/verify-api.sh https://YOUR-API.onrender.com

# Include slow Cursor scan (30-90s)
SCAN=1 SCAN_TIMEOUT=120 ./scripts/verify-api.sh http://127.0.0.1:8000
```

### Manual curl checklist

```bash
BASE=http://127.0.0.1:8000

curl -s $BASE/health | python3 -m json.tool
curl -s $BASE/api/engine/health | python3 -m json.tool
curl -s $BASE/api/ingest/status | python3 -m json.tool
curl -s $BASE/api/watcher/status | python3 -m json.tool
curl -s -m 120 -X POST $BASE/api/watcher/scan | python3 -m json.tool
curl -s $BASE/api/notifications | python3 -m json.tool
curl -s -X POST $BASE/api/notifications/n-incoming-scheduling/automate | python3 -m json.tool
```

### pytest expectations

```bash
cd backend
SLOTH_SKIP_ENV_FILE=1 INBOX_POLL_ENABLED=false pytest -q
# Expected: 60 passed in <1s
```

Tests isolate env at import time via `tests/conftest.py` so they never hit live Cursor/IMAP.

---

## Known gotchas

| Issue | Symptom | Fix |
|-------|---------|-----|
| **App password spaces** | `AUTHENTICATIONFAILED` | Gmail shows `abcd efgh ijkl mnop` — spaces are stripped in `config.py`, or paste without spaces |
| **IMAP not enabled** | Auth fails | Gmail settings → Enable IMAP |
| **Silent demo fallback** | `data_source: "demo"` despite IMAP configured | IMAP failed silently in `ingestion_service`; check logs for auth errors |
| **In-memory state** | Notifications empty after redeploy | Run `POST /api/watcher/scan` after each deploy/restart |
| **Cursor slow** | Scan hangs 30-90s | Normal; increase `CURSOR_TIMEOUT_SECONDS` if needed |
| **CORS errors in browser** | Frontend falls back to mock | Set `CORS_ORIGINS` to exact frontend URL, redeploy backend |
| **Render cold start** | First request slow / timeout | Hit `/health` then `/api/watcher/scan` before demo |
| **`.env` not saved** | Old credentials loaded | Save file, restart uvicorn (settings are cached until restart) |
| **LLM absurd durations** | 720-min meeting slots | `activation_service` clamps to 15–120 min |

---

## Pre-demo ritual (production)

```bash
export API=https://YOUR-API.onrender.com
curl -s $API/health
curl -s -m 120 -X POST $API/api/watcher/scan
curl -s $API/api/notifications
```

Then open the frontend — bell should show notifications within 15s.
