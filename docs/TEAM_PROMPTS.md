# Sloth — Technical teammate briefs

**Repo:** [github.com/mistyk786/lets_cee](https://github.com/mistyk786/lets_cee)  
**Branch:** `main` (includes PR #16: Cursor AI, IMAP, background watcher, notification prototype)  
**Goal:** Live public URL for hackathon judges + video. Full loop: Gmail (IMAP) → AI workflow detection → bell notification → one-click draft reply + slots (approval required, nothing auto-sent).

---

## Shared architecture (read first)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (Vite/React, repo root)                                        │
│  src/lib/http.ts          → VITE_API_BASE_URL, fetchWithFallback         │
│  src/lib/api.ts           → ENDPOINTS, snake_case mappers                │
│  src/context/AppContext.tsx → polls GET /api/notifications every 15s     │
│  src/pages/AutomatePage.tsx → POST /api/notifications/:id/automate       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS + CORS
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Backend (FastAPI, /backend)                                             │
│  app/main.py              → lifespan starts inbox_watcher thread         │
│  app/services/imap_service.py      → Gmail IMAP fetch (~5s batched)      │
│  app/services/cursor_service.py    → Cursor Cloud Agents REST API        │
│  app/services/workflow_service.py  → LLM → DetectedWorkflow JSON          │
│  app/services/inbox_watcher.py     → background poll every 120s            │
│  app/services/prototype_service.py → notifications + automate pipeline     │
│  app/engine.py            → SlothEngine facade (Member 2)                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ IMAP SSL :993
┌───────────────────────────────▼─────────────────────────────────────────┐
│  Gmail (demo account) — app password, no OAuth                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data source priority** (`ingestion_service.get_raw_emails`): upload JSON → IMAP → bundled demo JSON.

**State:** Notifications and watcher state are **in-memory** (process-local). Server restart clears notifications until next scan.

---

# Prompt 1 — Backend, deployment & API hardening

## Role
You own the **FastAPI backend** running on a **public HTTPS URL**, all secrets in the host dashboard, CORS for production frontend, and production reliability (health checks, cold start, logging).

## Repository map (your files)

| Path | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app, CORS `allow_origins`, lifespan → `inbox_watcher.start()` |
| `backend/app/config.py` | Pydantic settings from env; strips spaces from `IMAP_PASSWORD` |
| `backend/app/services/inbox_watcher.py` | Daemon thread; `POST /api/watcher/scan` triggers immediate scan |
| `backend/app/services/imap_service.py` | IMAP4_SSL, batched header fetch, scheduling filter |
| `backend/app/services/cursor_service.py` | `POST https://api.cursor.com/v1/agents`, poll run until FINISHED |
| `backend/app/services/prototype_service.py` | Notification list, `automate_notification()` |
| `backend/app/routers/notifications.py` | Watcher + notification routes |
| `backend/app/routers/ingestion.py` | `GET /api/ingest/status` |
| `backend/.env.example` | Template — copy to `.env`, **never commit** |
| `backend/requirements.txt` | `fastapi`, `uvicorn`, `httpx`, `python-multipart`, `pydantic-settings` |
| `backend/tests/` | 60 tests; run with `pytest -q` |

## Environment variables (production)

Set **all** of these in Render/Railway dashboard (not in git):

```bash
CURSOR_API_KEY=crsr_...          # cursor.com → Dashboard → Integrations
CURSOR_MODEL=composer-2.5
CURSOR_TIMEOUT_SECONDS=120       # Cursor agent can take 30-90s
CURSOR_POLL_INTERVAL_SECONDS=2

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=demo@gmail.com
IMAP_PASSWORD=xxxxxxxxxxxxxxxx   # 16-char Gmail app password, NO spaces
IMAP_MAILBOX=INBOX
IMAP_MAX_MESSAGES=80

INBOX_POLL_ENABLED=true
INBOX_POLL_INTERVAL_SECONDS=120

LOG_LEVEL=INFO
SLOTH_ENV=production
```

**Gmail setup checklist:**
1. Gmail → Settings → Forwarding and POP/IMAP → **Enable IMAP**
2. Google Account → Security → 2-Step Verification ON
3. App passwords → generate for "Mail"
4. Paste password without spaces (or with spaces — `config.py` strips them)

## API contract (your endpoints to keep working)

### `GET /health`
```json
{ "status": "ok" }
```

### `GET /api/ingest/status`
```json
{
  "cursor_configured": true,
  "imap_configured": true,
  "uploaded_emails": false,
  "uploaded_calendar": false,
  "demo_available": true,
  "alternatives_to_gmail_api": [...]
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
Triggers full inbox scan + Cursor analysis. **May take 30-90 seconds.** Response:
```json
{
  "data_source": "imap",
  "demo_mode": false,
  "new_messages": 0,
  "analyzed": true,
  "notification_count": 2,
  "workflow_name": "External Event Registration..."
}
```

### `GET /api/notifications`
Returns `NotificationItem[]`:
```json
[{
  "id": "n-incoming-scheduling",
  "title": "New scheduling email — automate reply?",
  "message": "Sender asked to \"Subject\". Sloth scored this workflow 78/100...",
  "created_at": "...",
  "read": false,
  "opportunity_id": "internal-meeting-scheduling",
  "recoverable_minutes_per_week": 165,
  "action": "automate",
  "status": "pending"
}]
```

### `POST /api/notifications/{notification_id}/automate`
Returns `AutomateNotificationResponse` with `activation.draft_reply`, `activation.proposed_slots[]`, `activation.tentative_event`.

## Tasks

### Task 1.1 — Local verification
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill secrets
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run in another terminal:
```bash
curl -s http://127.0.0.1:8000/api/ingest/status | python3 -m json.tool
curl -s http://127.0.0.1:8000/api/watcher/status | python3 -m json.tool
curl -s -m 120 -X POST http://127.0.0.1:8000/api/watcher/scan | python3 -m json.tool
curl -s http://127.0.0.1:8000/api/notifications | python3 -m json.tool
pytest -q   # expect: 60 passed
```

**Acceptance:** `imap_configured: true`, scan returns `data_source: "imap"`, `demo_mode: false`, notifications non-empty.

### Task 1.2 — Deploy to Render (or Railway)

**Render Web Service:**
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- Add all env vars from section above

**Optional:** Add `render.yaml` at repo root for reproducible deploys.

### Task 1.3 — CORS for production frontend

When Frontend teammate gives you URL (e.g. `https://sloth-xyz.vercel.app`), edit `backend/app/main.py`:

```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://sloth-xyz.vercel.app",   # ADD
    "https://sloth-xyz.vercel.app/",  # ADD if needed
],
```

Commit, push, redeploy.

### Task 1.4 — Production hardening (if time)

- [ ] Expose `SlothEngine.health()` at `GET /api/engine/health` (returns `cursor_configured`, version)
- [ ] Log `run_inbox_scan` duration and `data_source` at INFO
- [ ] Document cold-start: Render free tier sleeps — run `POST /api/watcher/scan` to wake before demo
- [ ] Add production frontend URL to CORS via env var `CORS_ORIGINS` (comma-separated) instead of hardcoding — optional refactor

## Integration handoff

| Deliverable | Send to |
|-------------|---------|
| `https://YOUR-API.onrender.com` | Frontend, QA, Demo |
| Confirmation CORS includes frontend URL | Frontend |
| Demo Gmail credentials location (1Password, not git) | QA only |

## Known gotchas

- **IMAP auth fails with spaces in app password** — fixed in `config.py`, but verify 16-char password works: `python3 -c "import imaplib; c=imaplib.IMAP4_SSL('imap.gmail.com'); c.login('user','pass'); print('ok')"`
- **Cursor scan hangs tests** — tests use `tests/conftest.py` to skip `.env`; don't remove that
- **Silent IMAP fallback to demo** — if IMAP fails, `ingestion_service` falls through to demo data without 500; check logs for `AUTHENTICATIONFAILED`
- **In-memory state** — redeploy clears notifications; run scan after deploy

## Definition of done

- [ ] Public API URL shared with team
- [ ] All curl checks pass on production
- [ ] CORS allows frontend origin (no browser console CORS errors)
- [ ] `POST /api/watcher/scan` completes on prod within 120s
- [ ] `pytest -q` passes locally
- [ ] No secrets in git

---

# Prompt 2 — Frontend, deployment & live data wiring

## Role
You own the **React/Vite frontend** on a **public HTTPS URL**, connected to production backend via `VITE_API_BASE_URL`, with the **notification → automate** flow working end-to-end and **minimal live data** on the dashboard (not pure mock).

## Repository map (your files)

| Path | Purpose |
|------|---------|
| `src/lib/http.ts` | `isBackendConfigured()`, `fetchWithFallback()` — falls back to mock on error |
| `src/lib/api.ts` | All API methods; `ENDPOINTS` constant |
| `src/lib/mappers.ts` | snake_case backend → camelCase frontend types |
| `src/lib/backend/types.ts` | Backend response TypeScript types |
| `src/lib/types.ts` | Frontend UI types |
| `src/lib/mockData.ts` | Mock fallback data (keep working when no API URL) |
| `src/context/AppContext.tsx` | Polls `GET /api/notifications` every 15s when backend configured |
| `src/components/assistant/NotificationBell.tsx` | Bell UI; navigates to `/automate/:id` when `action === "automate"` |
| `src/pages/AutomatePage.tsx` | One-click automate UI |
| `src/pages/SetupPage.tsx` | Bootstrap trigger; calls `api.bootstrapPrototype()` |
| `src/pages/OverviewPage.tsx` | **Mostly mock** — wire live status here |
| `src/App.tsx` | Routes including `/automate/:notificationId` |
| `.env.local` | `VITE_API_BASE_URL=http://127.0.0.1:8000` (gitignored) |
| `package.json` | `npm run dev`, `npm run build` |
| `vite.config.ts` | Vite config |

## Environment variables

```bash
# .env.local (development, gitignored)
VITE_API_BASE_URL=http://127.0.0.1:8000

# Vercel / production (set in host dashboard, rebuild after change)
VITE_API_BASE_URL=https://YOUR-API.onrender.com

# Force mock mode even with URL set (optional debug)
VITE_USE_MOCK_API=false
```

**Critical:** Vite bakes `VITE_*` at **build time**. Changing env on Vercel requires **redeploy**.

## Existing API integration (do not break)

### Notification polling (`AppContext.tsx`)
```typescript
useEffect(() => {
  if (!isBackendConfigured()) {
    api.getNotifications().then(setNotifications);
    return;
  }
  void refreshNotifications();
  const interval = window.setInterval(() => void refreshNotifications(), 15_000);
  return () => window.clearInterval(interval);
}, []);
```

### Endpoints already in `api.ts`
```typescript
ENDPOINTS.notifications          // GET
ENDPOINTS.automateNotification(id) // POST
ENDPOINTS.prototypeBootstrap     // POST
// Missing — you add:
// ENDPOINTS.watcherStatus        // GET /api/watcher/status
// ENDPOINTS.watcherScan          // POST /api/watcher/scan
```

### Automate flow (`AutomatePage.tsx`)
1. Load notification from AppContext or `GET /api/notifications/:id`
2. User clicks "Run automation"
3. `api.automateNotification(id, opportunityId, rules)` → `POST /api/notifications/:id/automate`
4. Display `draft_reply`, `proposed_slots`, `tentative_event`

## Tasks

### Task 2.1 — Local E2E verification

```bash
npm install
echo 'VITE_API_BASE_URL=http://127.0.0.1:8000' > .env.local
npm run dev
```

1. Ensure backend running (Backend teammate)
2. Open app (note port — may be 5173 or 5174)
3. Wait ~2 min OR go to `/setup` → "Scan inbox & notify me"
4. Bell icon → should show unread dot
5. Click notification with `action: automate` → `/automate/n-incoming-scheduling`
6. "Run automation" → draft reply + 3 slots appear

**Acceptance:** No `[SLOTH api] ... using mock fallback` in console when backend is up.

### Task 2.2 — Deploy to Vercel

1. Import `mistyk786/lets_cee` on Vercel
2. Framework preset: **Vite**
3. Root directory: `.` (repo root, not `backend`)
4. Build: `npm run build`
5. Output directory: `dist`
6. Environment: `VITE_API_BASE_URL=https://YOUR-API.onrender.com`
7. Deploy → share URL with Backend teammate for CORS

### Task 2.3 — Add watcher API to frontend (required)

**Add to `src/lib/backend/types.ts`:**
```typescript
export type BackendWatcherStatus = {
  enabled: boolean;
  running: boolean;
  poll_interval_seconds: number;
  last_scan_at: string | null;
  next_scan_in_seconds: number | null;
  last_error: string | null;
  notification_count: number;
  data_source: "demo" | "imap" | "upload";
  initial_scan_done: boolean;
  pending_email_subject: string | null;
};
```

**Add to `src/lib/api.ts` ENDPOINTS:**
```typescript
watcherStatus: "/api/watcher/status",
watcherScan: "/api/watcher/scan",
```

**Add methods:**
```typescript
async getWatcherStatus(): Promise<BackendWatcherStatus> {
  return fetchWithFallback(ENDPOINTS.watcherStatus, async () => ({
    enabled: false, running: false, /* mock */ ...
  }));
},
async triggerWatcherScan(): Promise<unknown> {
  return fetchWithFallback(ENDPOINTS.watcherScan, async () => ({}), {
    method: "POST",
  });
},
```

### Task 2.4 — Live status panel on Overview or Setup (required)

Add a small **"Live engine status"** card showing:
- `data_source` badge: `imap` (green) vs `demo` (amber)
- `running`: watcher active
- `last_scan_at`: relative time
- `pending_email_subject`: latest scheduling email detected
- Button: "Scan now" → `POST /api/watcher/scan` with loading spinner (30-90s)

Suggested location: top of `SetupPage.tsx` or `OverviewPage.tsx`.

Do **not** replace entire Overview mock — only add this panel + optionally set `workflowName` from watcher/last bootstrap if available.

### Task 2.5 — Live vs mock indicator in Header (optional)

When `isBackendConfigured()`, show small pill: **"Live"** (green) vs mock mode **"Demo data"** (gray) near Logo or NotificationBell.

### Task 2.6 — Fix README

`README.md` still says "mock only, no backend". Update lines 9-11 to reflect live backend integration and link to `docs/TEAM_PROMPTS.md` or `docs/DEMO.md`.

## Type mapping reference

| Backend (snake_case) | Frontend (camelCase) |
|---------------------|----------------------|
| `created_at` | `createdAt` |
| `opportunity_id` | `opportunityId` |
| `recoverable_minutes_per_week` | `recoverableMinutesPerWeek` |
| `draft_reply` | in `ActivateAutomationResult` via `mapActivationResponse` |

Mapper: `src/lib/mappers.ts` → `mapNotificationItem()`.

## Integration handoff

| Need from | What |
|-----------|------|
| Backend teammate | Production API URL + CORS confirmation |
| QA teammate | Sign-off that prod E2E works |

| Deliverable | Send to |
|-------------|---------|
| `https://YOUR-APP.vercel.app` | Backend (CORS), QA, Demo |

## Known gotchas

- **`fetchWithFallback` silently uses mock on any error** — check Network tab; CORS errors look like mock data
- **Port mismatch** — if Vite uses 5174, backend CORS must include it (already in `main.py` for local)
- **`getOverview()` still mock-only** — `api.getOverview()` doesn't hit backend yet; only add watcher panel unless you wire `POST /api/analyse-workflow`
- **AutomatePage uses `api.getLastAnalysis()`** — may be null if user skips Setup; falls back to `mockOpp.proposedRules` (OK)

## Definition of done

- [ ] Public frontend URL shared with team
- [ ] `VITE_API_BASE_URL` points to production API
- [ ] Bell shows notifications from prod without manual refresh
- [ ] Automate flow works on prod URL
- [ ] Live status panel shows `data_source: imap` when backend connected
- [ ] Mock fallback still works when `VITE_API_BASE_URL` unset
- [ ] `npm run build` succeeds (no TS errors)

---

# Prompt 3 — Integration QA, docs & reliability

## Role
You own **end-to-end verification** (local + production), the **honest capability matrix** (what is live vs mock), bug triage, and **`docs/DEMO.md`** so the team and judges know exactly what works.

## System under test

```text
Gmail IMAP → inbox_watcher (120s) → cursor_service (30-90s)
  → workflow_service → prototype_service → GET /api/notifications
  → Frontend bell (15s poll) → AutomatePage → POST .../automate
  → activation_service → draft_reply + proposed_slots + tentative_event
```

**Not in scope (document as mock):**
- Sending email via Gmail API
- Real Google Calendar OAuth free/busy
- Overview/Opportunities/Effectiveness charts (mostly `mockData.ts`)
- Persistent database (all state in-memory)

## Test matrix

### Layer 1 — Backend API (curl)

Run against `BASE=http://127.0.0.1:8000` locally, then `BASE=https://prod-api` on production.

| # | Request | Expected | P0? |
|---|---------|----------|-----|
| 1 | `GET $BASE/health` | `{"status":"ok"}` | Yes |
| 2 | `GET $BASE/api/ingest/status` | `cursor_configured:true`, `imap_configured:true` | Yes |
| 3 | `GET $BASE/api/watcher/status` | `running:true` after startup | Yes |
| 4 | `POST $BASE/api/watcher/scan` (timeout 120s) | `data_source:"imap"`, `demo_mode:false` | Yes |
| 5 | `GET $BASE/api/notifications` | ≥1 item, `action:"automate"` for `n-incoming-scheduling` | Yes |
| 6 | `POST $BASE/api/notifications/n-incoming-scheduling/automate` | `draft_reply` non-empty, `proposed_slots.length >= 1` | Yes |
| 7 | `GET $BASE/api/demo-data` | 200, emails array | No |
| 8 | `POST $BASE/api/analyse-workflow` `{}` | 200, `workflow_name` string | No |

### Layer 2 — Backend unit tests

```bash
cd backend
SLOTH_SKIP_ENV_FILE=1 INBOX_POLL_ENABLED=false pytest -q
# Expected: 60 passed in <1s
```

If tests hang >10s, `tests/conftest.py` is broken — env is leaking to Cursor API.

### Layer 3 — Frontend (browser)

Prerequisites: `.env.local` with `VITE_API_BASE_URL`, backend running.

| # | Step | Expected | P0? |
|---|------|----------|-----|
| 1 | Open `/` | Landing loads | Yes |
| 2 | `/setup` → Scan inbox | Navigates to overview, no console error | Yes |
| 3 | Bell shows unread count | Within 15s of scan completing | Yes |
| 4 | Click automate notification | `/automate/n-incoming-scheduling` | Yes |
| 5 | Run automation | Draft + slots visible | Yes |
| 6 | Console | No CORS errors | Yes |
| 7 | Console | No `[SLOTH api] ... mock fallback` when backend up | Yes |

### Layer 4 — Production (after deploy)

Repeat Layer 1 with production `BASE` and Layer 3 with production frontend URL.

**Cold start test (Render free tier):**
1. Wait 15 min idle
2. Hit frontend URL
3. Time from page load to notifications appearing
4. Document wake procedure: `POST /api/watcher/scan` first

## Tasks

### Task 3.1 — Execute full matrix

Create `docs/QA_REPORT.md` with:
- Date, tester name, environment URLs
- Pass/fail for each row
- Screenshots for P0 failures
- Response JSON snippets for failed API calls

### Task 3.2 — Create `docs/DEMO.md`

```markdown
# Sloth demo guide

## Capability matrix
| Feature | Status | How to verify |
|---------|--------|---------------|
| Read Gmail via IMAP | LIVE | ingest/status → imap_configured |
| AI workflow detection | LIVE | watcher/scan → demo_mode: false |
| Background polling | LIVE | watcher/status → running: true |
| Push notifications (bell) | LIVE | GET /notifications |
| Draft reply generation | LIVE | POST .../automate |
| Calendar slot proposal | PARTIAL | Demo busy events; optional .ics upload |
| Send email / create calendar event | NOT BUILT | By design — approval only |
| Dashboard ROI charts | MOCK | mockData.ts |

## Pre-demo checklist (5 min before)
1. curl -X POST $API/api/watcher/scan  (wait up to 90s)
2. curl $API/api/notifications  (confirm automate notification)
3. Open $FRONTEND_URL
4. Confirm bell unread
5. Optional: click through automate once

## Troubleshooting
- Bell empty → run scan, wait 15s, check watcher/status
- CORS error → backend allow_origins missing frontend URL
- demo_mode: true → IMAP failed; check ingest/status, logs
- Scan timeout → Cursor API slow; retry once
```

### Task 3.3 — Bug triage

| Priority | Definition | Example |
|----------|------------|---------|
| P0 | Blocks live demo | CORS, IMAP auth fail on prod, automate 500 |
| P1 | Degraded demo | Dashboard shows wrong data, slow scan |
| P2 | Polish | README outdated, UI spacing |

File GitHub issues or Slack list with: repro steps, expected, actual, logs.

### Task 3.4 — Optional: `.ics` calendar test

```bash
# Export Google Calendar → .ics file
curl -X POST $API/api/ingest/calendar -F "file=@calendar.ics"
curl -X POST $API/api/notifications/n-incoming-scheduling/automate
# Verify proposed_slots avoid uploaded busy times
```

## Integration handoff

| From | Need |
|------|------|
| Backend | Prod API URL |
| Frontend | Prod app URL |
| Both | Deploy complete before Layer 4 |

| Deliverable | Send to |
|-------------|---------|
| `docs/DEMO.md` | Whole team |
| `docs/QA_REPORT.md` | Demo lead |
| P0 bug list | Backend + Frontend |

## Definition of done

- [ ] All P0 rows pass on production
- [ ] `docs/DEMO.md` committed to repo
- [ ] `docs/QA_REPORT.md` with evidence
- [ ] Team sign-off message: "Prod E2E verified" or list of blockers

---

# Prompt 4 — Demo production, video & judge narrative

## Role
You own the **2-3 minute judge presentation**, **backup video recording**, **demo script**, and ensuring the story matches verified capabilities (coordinate with QA — no overselling mock features).

## Product story (approved)

**Problem:** Knowledge workers repeat the same email → calendar → reply sequence dozens of times per month.

**Solution:** Sloth passively watches Gmail, uses AI to detect repeated scheduling workflows, nudges the user via an in-app notification, and with **one click** prepares a draft reply + meeting time slots + tentative calendar hold. **Nothing is sent without explicit user approval.**

**Differentiator:** Measurable ROI (opportunity score, time saved forecast) + safety (approval gate, internal-contacts rules).

## What is REAL vs MOCK (must match QA doc)

| Show in demo | Live? | How to phrase |
|--------------|-------|---------------|
| Bell notification from real inbox | Yes | "Sloth already scanned my Gmail" |
| Workflow name from AI | Yes | "Cursor AI detected this pattern" |
| Draft reply + time slots | Yes | "Prepared, not sent" |
| Tentative calendar hold | Yes (object) | "Would create this event after I approve" |
| Overview charts / opportunity score UI | Partial | "Dashboard shows projected savings" — don't claim live if mock |
| Actually sending email | No | "Next step: Gmail send API after approval" |

## Dependencies (blocking)

Before recording or live demo:
- [ ] Backend prod URL from Prompt 1
- [ ] Frontend prod URL from Prompt 2
- [ ] QA sign-off from Prompt 3 (`docs/QA_REPORT.md` all P0 pass)
- [ ] Pre-demo scan completed successfully on prod

## Pre-demo ritual (execute every time)

```bash
export API=https://YOUR-API.onrender.com
export APP=https://YOUR-APP.vercel.app

# Wake API if cold (Render free tier)
curl -s $API/health

# Force fresh analysis (30-90 seconds — do NOT skip)
curl -s -m 120 -X POST $API/api/watcher/scan | python3 -m json.tool

# Verify notifications ready
curl -s $API/api/notifications | python3 -m json.tool

# Open frontend
open $APP
# Wait 15s for bell poll → confirm unread notification
```

## Demo script (2 minutes, live URL only)

| Time | Action | Say |
|------|--------|-----|
| 0:00 | Slide or verbal hook | "Scheduling one meeting takes 4+ emails. Sloth automates the boring parts — with your approval." |
| 0:15 | Open `$APP` landing | "This is our live deployment — not localhost." |
| 0:25 | Point to bell (unread) | "Sloth background-watched my real Gmail inbox and detected a repeated scheduling workflow." |
| 0:40 | Click automate notification | Navigate to `/automate/...` |
| 0:50 | Click "Run automation" | Wait for draft (1-3s) |
| 1:00 | Scroll draft reply | "Sloth drafted this reply proposing three time slots." |
| 1:15 | Show proposed slots + tentative event | "It would hold this calendar slot — but nothing was sent yet." |
| 1:25 | Emphasize approval | "I review and approve before anything goes out. That's our safety model." |
| 1:35 | Optional: flash Overview | "Dashboard tracks opportunity score and projected time saved." |
| 1:50 | Close | "IMAP today, full OAuth tomorrow. Engine is live — repo on GitHub." |

## Video recording spec

- **Resolution:** 1920×1080
- **Browser:** Chrome, hide bookmarks bar, no localhost URLs in address bar
- **Account:** Use demo Gmail (not personal sensitive data)
- **Length:** ≤ 3 minutes
- **Backup:** Record AFTER successful pre-demo ritual
- **Upload:** YouTube unlisted or Google Drive link in submission

## Judge Q&A cheat sheet

| Question | Answer |
|----------|--------|
| Does it read real email? | Yes — IMAP with Gmail app password, polls every 2 minutes. |
| Does it auto-send? | No — draft-for-approval by design. |
| What AI? | Cursor Cloud Agents API — sends email threads, returns structured workflow JSON. |
| Privacy? | Demo account; production would use OAuth with scoped permissions. |
| Calendar integration? | Slot proposal works; real free/busy via `.ics` upload or future Google Calendar OAuth. |
| What if AI fails? | Falls back to demo data silently — check `demo_mode` in scan response. |
| Tech stack? | FastAPI + React/Vite + Cursor API + IMAP. |
| Team split? | Member 2: AI engine; Member 3: API layer; Member 1: Frontend. |

## Tasks

### Task 4.1 — Write `docs/DEMO_SCRIPT.md`

Expand the table above with exact URLs filled in, speaker notes, and fallback plan if live demo fails ("We have a video").

### Task 4.2 — Record backup video

After QA sign-off + pre-demo ritual on production.

### Task 4.3 — One-slide pitch

Problem → Solution diagram → Live URL QR/link → GitHub repo → Team names.

### Task 4.4 — Rehearsal

One full run with teammates watching; time it; fix script if > 3 min.

## Fallback plan

| Failure | Fallback |
|---------|----------|
| API cold start | Play backup video; run scan during Q&A |
| No notifications | Show curl output + recording |
| Automate fails | Show previous successful `POST .../automate` JSON in slides |
| CORS broken | Backend teammate fixes live; use video |

## Definition of done

- [ ] `docs/DEMO_SCRIPT.md` with prod URLs filled in
- [ ] Backup video link shared with team
- [ ] One rehearsal completed, timed ≤ 3 min
- [ ] Pitch slide ready
- [ ] QA sign-off obtained before recording

---

## Team coordination timeline

```text
Day 1 (parallel):
  Friend 1: Local backend verify + deploy API
  Friend 2: Local frontend verify + deploy app (needs API URL for env)

Day 1 (after URLs exchanged):
  Friend 1: Add CORS for frontend URL, redeploy
  Friend 2: Rebuild Vercel with VITE_API_BASE_URL, add live status panel

Day 2:
  Friend 3: Full QA matrix on production → docs/DEMO.md + QA_REPORT.md

Day 2-3:
  Friend 4: Pre-demo ritual → record video → rehearsal

Before submission:
  All: POST /api/watcher/scan on prod → confirm bell → automate once
```

## Slack message template (Murtaza posts after assigning)

```text
Team — 4 workstreams for live demo. Read your section in docs/TEAM_PROMPTS.md:

@backend → Prompt 1: deploy API, CORS, env vars
@frontend → Prompt 2: deploy Vercel, wire watcher status panel
@qa → Prompt 3: E2E test matrix, docs/DEMO.md
@demo → Prompt 4: script + video after QA sign-off

Blockers go in #sloth-dev. URLs posted as soon as deploys land.
```
