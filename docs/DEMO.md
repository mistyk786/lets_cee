# SLOTH / FlowFix — Demo Script & Pre-Demo Ritual

3–5 minute judge demo. Rehearse this exact path twice before presenting.

**Pitch line:** *"SLOTH doesn't just automate tasks. It identifies which workflow is worth automating, helps teams configure it safely, and proves whether it delivered value."*

---

## Pre-demo ritual (~10 minutes)

Do this on the **same machine** you present from. All commands assume backend on port 8000.

### 1. Pull known-good code

```bash
cd /path/to/lets_cee
git switch main
git pull origin main
git log -1 --oneline
```

Optional safety tag: `git checkout demo-ready` if tagged.

### 2. Backend environment

```bash
cd backend
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt
```

Copy env if needed: `cp .env.example .env` (or maintain `backend/.env`).

**Minimal demo (no IMAP):** leave `IMAP_*` empty — uses bundled demo data.

**Live inbox (optional wow):** set in `backend/.env`:

```bash
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=you@gmail.com
IMAP_PASSWORD=your16charapppassword
INBOX_POLL_ENABLED=true
INBOX_POLL_INTERVAL_SECONDS=120
```

Send yourself a test email first: **Subject:** `Can we sync next week?`

### 3. Frontend environment

```bash
cd ..   # repo root
cp .env.example .env.local
# Ensure:
# VITE_API_BASE_URL=http://127.0.0.1:8000
# VITE_USE_MOCK_API is NOT true
npm install
```

### 4. Kill stale servers

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
# kill <PID> if needed
lsof -nP -iTCP:5173 -sTCP:LISTEN
# kill <PID> if needed
```

### 5. Start servers (two terminals)

**Terminal A — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal B — frontend:**

```bash
npm run dev
```

### 6. Layer 1 curl smoke (P0 — must all pass)

Run exactly these; expect values shown.

```bash
# C1 Health
curl -s http://127.0.0.1:8000/health
# → {"status":"ok"}

# C2 Ingest status
curl -s http://127.0.0.1:8000/api/ingest/status | python3 -m json.tool

# C3 Demo data counts
curl -s http://127.0.0.1:8000/api/demo-data | python3 -c "import sys,json;d=json.load(sys.stdin); print('emails',len(d['emails']),'events',len(d['calendar_events']))"
# → emails 60 events 20

# C4 Analyse
curl -s -X POST http://127.0.0.1:8000/api/analyse-workflow | python3 -c "import sys,json;w=json.load(sys.stdin);print(w['workflow_name'],w['opportunity_score'])"
# → Email-to-Calendar Meeting Scheduling 78.5

# C6 Forecast
curl -s -X POST http://127.0.0.1:8000/api/forecast \
  -H 'Content-Type: application/json' \
  -d '{"eligible_runs":40,"manual_minutes_per_run":18,"review_minutes_per_run":3,"exception_minutes":12}' \
  | python3 -c "import sys,json;print('likely',json.load(sys.stdin)['likely_hours_saved'])"
# → likely 9.8

# C8 Effectiveness
curl -s http://127.0.0.1:8000/api/effectiveness | python3 -c "import sys,json;e=json.load(sys.stdin);print('score',e['overall_score'],'status',e['safety_status'])"
# → score 74.0 status ok

# C10 Watcher scan (uses IMAP if configured, else demo)
curl -s -X POST http://127.0.0.1:8000/api/watcher/scan | python3 -m json.tool
# Check: "data_source": "imap" OR "demo", "notification_count" >= 1

# C11 Bootstrap
curl -s -X POST http://127.0.0.1:8000/api/prototype/bootstrap | python3 -c "import sys,json;b=json.load(sys.stdin);print(b['workflow_name'],len(b['notifications']),b.get('data_source'))"

# C12 Notifications
curl -s http://127.0.0.1:8000/api/notifications | python3 -m json.tool

# C13 Watcher health (IMAP errors)
curl -s http://127.0.0.1:8000/api/watcher/status | python3 -c "import sys,json;s=json.load(sys.stdin);print('error',s.get('last_error'),'source',s.get('data_source'),'subject',s.get('pending_email_subject','')[:50])"
```

**IMAP sanity:** `imap_configured: true` in ingest status + `data_source: "imap"` in scan = live mail loading. `demo_mode: true` on scan only means analysis used fallback scoring — not that email failed.

### 7. Layer 2 pytest

```bash
cd backend && .venv/bin/python -m pytest -q
# → all passed
```

### 8. Layer 3 browser spot-check

1. Open http://localhost:5173
2. **Start prototype** → **Analyse workflow**
3. Confirm notification bell has an item
4. Click through to **Automate** once (verify draft + slots)

### 9. Tag readiness

If all P0 checks pass, Member 4 may tag:

```bash
git tag demo-ready
git push origin demo-ready
```

Fill in [QA_REPORT.md](./QA_REPORT.md) run metadata and sign-off.

---

## Optional: `.ics` calendar upload test

Use when demoing calendar-aware slot finding with **uploaded** busy times instead of `demo_calendar.json`.

### Create a minimal test file

```bash
cat > /tmp/demo-busy.ics << 'EOF'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SLOTH Demo//EN
BEGIN:VEVENT
UID:demo-busy-1@test
DTSTART:20260622T091500Z
DTEND:20260622T094500Z
SUMMARY:Existing standup
END:VEVENT
END:VCALENDAR
EOF
```

### Upload

```bash
curl -s -X POST http://127.0.0.1:8000/api/ingest/calendar \
  -F "file=@/tmp/demo-busy.ics;type=text/calendar" | python3 -m json.tool
# → {"source":"upload","event_count":1}
```

### Verify ingest status

```bash
curl -s http://127.0.0.1:8000/api/ingest/status | python3 -c "import sys,json;print(json.load(sys.stdin)['uploaded_calendar'])"
# → True
```

### Activate and check slots avoid 09:15–09:45

```bash
curl -s -X POST http://127.0.0.1:8000/api/activate-automation | python3 -c "
import sys,json
a=json.load(sys.stdin)
for s in a['proposed_slots']:
    print(s['start_time'], '->', s['end_time'])
"
# First slot should start at or after 09:45 UTC on 2026-06-22 (demo activation day)
```

### Cleanup

```bash
curl -s -X DELETE http://127.0.0.1:8000/api/ingest/uploads
```

---

## Demo script (present to judges)

**Total:** ~4 minutes + 1 minute Q&A buffer

| Time | Say / do | Screen |
|---|---|---|
| 0:00 | "Teams lose hours on repetitive email-and-calendar coordination. SLOTH finds which workflow is worth automating." | Landing `/` |
| 0:30 | "We connect to approved email activity — demo uses our inbox or bundled dataset — and detect repeated scheduling patterns." | `/setup` → **Analyse workflow** |
| 1:00 | "Here's the opportunity score and where manual effort concentrates." | `/overview` |
| 1:30 | "Sloth mapped seven manual steps; the bottlenecks are calendar checks and drafting replies." | `/opportunities/internal-meeting-scheduling` → workflow tab |
| 2:00 | "We propose an approval-gated automation — human stays in the loop." | Proposed automation + editable rules |
| 2:30 | "Forecast: conservative to optimistic hours saved per month." | Forecast panel |
| 3:00 | "A new scheduling email arrived — Sloth can automate the reply safely." | Notification bell → **Automate** |
| 3:30 | "Three proposed slots, draft reply, tentative calendar hold — nothing sends without approval." | Automate success screen |
| 4:00 | "After activation, we measure effectiveness — coverage, reliability, safety." | `/insights` |

---

## Fallback plan

If live API fails mid-demo:

1. Set `VITE_USE_MOCK_API=true` in `.env.local` and restart `npm run dev` — full UI still works.
2. Or use screenshots / short screen recording from rehearsal.
3. Backend-only backup: run curl C4 + C9 and show JSON in terminal.

**Do not** debug IMAP or OAuth on stage.

---

## Judge FAQ (short answers)

| Question | Answer |
|---|---|
| Why not Zapier? | Zapier connects apps; SLOTH **detects** which workflow repeats, scores ROI, forecasts savings, and measures effectiveness after activation. |
| Why not ChatGPT? | ChatGPT is general; SLOTH is workflow-specific with approval gates, calendar rules, and an effectiveness score. |
| Privacy? | Demo uses IMAP read-only or static data; no auto-send; approval required before any outbound action. |
| Bad automation? | Approval mode, safety cap on effectiveness (`needs_review`), internal-contacts-only rules. |
| Time saved measured? | Forecast before activation; effectiveness score after — realised vs forecast minutes. |

---

## Related docs

- [architecture.md](./architecture.md) — API reference
- [QA_REPORT.md](./QA_REPORT.md) — full test matrix and bug log template
