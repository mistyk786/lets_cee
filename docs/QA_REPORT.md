# SLOTH / FlowFix — QA Report Template

Use this document before every demo rehearsal and after each merged PR. Fill in **Run metadata**, check boxes in the **4-layer test matrix**, and log issues in **Bug log**.

---

## Run metadata

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Tester | |
| Git branch / tag | `main` / `demo-ready` |
| Backend commit | |
| Frontend commit | |
| Environment | local / staging / production |
| Backend URL | `http://127.0.0.1:8000` |
| Frontend URL | `http://localhost:5173` |
| `imap_configured` | true / false |
| `cursor_configured` | true / false |
| `VITE_API_BASE_URL` set | true / false |
| `VITE_USE_MOCK_API` | true / false |

**Overall result:** PASS / FAIL (any open P0 = FAIL)

---

## Bug triage definitions

| Priority | Definition | Demo impact | Action |
|---|---|---|---|
| **P0** | Demo-blocking: server won't start, core journey crashes, wrong data with no fallback, security leak (secrets in repo/logs) | Cannot rehearse or present | Fix before demo; do not tag `demo-ready` |
| **P1** | Major but workaround exists: wrong notification picked, mock fallback when live expected, broken non-core screen | Demo works with script adjustment | Fix if time; document workaround in [DEMO.md](./DEMO.md) |
| **P2** | Cosmetic, copy, minor UX, stale docs, nice-to-have endpoints | No impact on 3–5 min pitch | Backlog |

**Examples**

- P0: `uvicorn` crash on startup (missing `python-multipart`); CORS blocks all API calls; `/api/prototype/bootstrap` returns 500.
- P1: IMAP loads but picks hackathon reminder instead of scheduling email; opportunities inbox still mock-only.
- P2: Setup page says "demo dataset" while IMAP is live; effectiveness `safety_status` label mismatch (`ok` vs `healthy`).

---

## Capability matrix (live vs mock vs not built)

| Capability | Backend | Frontend wired | Data source | Notes |
|---|---|---|---|---|
| Health check | Live | N/A | — | `GET /health` |
| Raw demo dataset | Live | Partial | Static `demo_emails.json` / `demo_calendar.json` | `GET /api/demo-data` — **not** IMAP inbox |
| IMAP inbox read | Live | Via watcher/bootstrap | Gmail app password | No OAuth |
| Email JSON upload | Live | Not in UI | `POST /api/ingest/emails` | curl only |
| Calendar `.ics` upload | Live | Not in UI | `POST /api/ingest/calendar` | curl only; see [DEMO.md](./DEMO.md) |
| Workflow analysis | Live + fallback | Live | Cursor API or demo cache | `demo_mode: true` = analysis fallback, not email source |
| Generate automation steps | Live + fallback | Live | Engine / cache | Returns `WorkflowStep[]` |
| Forecast | Live + fallback | Live | Scoring engine | Accepts frontend `rules` body |
| Effectiveness score | Live + fallback | Live | Seeded metrics | |
| Activate automation | Live | Live | In-memory simulation | Slots + draft + tentative event |
| Prototype bootstrap | Live | Live | IMAP → upload → demo | Setup page entry |
| Notifications list | Live | Live | In-memory from scans | Bell + Automate page |
| Automate notification | Live | Live | Real activation pipeline | Primary demo wow moment |
| Background inbox poll | Live | N/A | IMAP every 120s default | Starts with API lifespan |
| Opportunities inbox (full CRUD) | Not built | **Mock only** | `mockData.ts` | `/api/opportunities/*` not implemented |
| Pause automation | Not built | Mock only | — | |
| Gmail OAuth | Not built | — | — | Out of scope |
| Google Calendar OAuth | Not built | — | — | Out of scope |
| Send real email | Not built | — | — | Draft only |
| Write real calendar | Not built | — | Tentative in-memory only | |
| User accounts / auth | Not built | — | — | |
| Persistent DB | Not built | — | — | Restart clears activation state |

---

## 4-layer test matrix

Legend: **P0** = must pass for demo tag. Layer runs top-to-bottom; fix P0 failures before browser/production.

### Layer 1 — curl (API smoke, ~5 min)

Run from repo root with backend up (`cd backend && .venv/bin/uvicorn app.main:app --reload`).

| ID | P0 | Test | Command | Expected | Pass |
|---|---|---|---|---|---|
| C1 | **P0** | Health | `curl -s http://127.0.0.1:8000/health` | `{"status":"ok"}` | ☐ |
| C2 | **P0** | Ingest status | `curl -s http://127.0.0.1:8000/api/ingest/status \| python3 -m json.tool` | JSON; no 5xx | ☐ |
| C3 | **P0** | Demo data | `curl -s http://127.0.0.1:8000/api/demo-data \| python3 -c "import sys,json;d=json.load(sys.stdin); print(len(d['emails']), len(d['calendar_events']))"` | `60 20` | ☐ |
| C4 | **P0** | Analyse workflow | `curl -s -X POST http://127.0.0.1:8000/api/analyse-workflow \| python3 -c "import sys,json; w=json.load(sys.stdin); print(w['workflow_name'], w['opportunity_score'])"` | Name + score (e.g. 78.5) | ☐ |
| C5 | **P0** | Generate automation | `curl -s -X POST http://127.0.0.1:8000/api/generate-automation \| python3 -c "import sys,json; print(len(json.load(sys.stdin)))"` | `7` (step count) | ☐ |
| C6 | **P0** | Forecast | `curl -s -X POST http://127.0.0.1:8000/api/forecast -H 'Content-Type: application/json' -d '{"eligible_runs":40,"manual_minutes_per_run":18,"review_minutes_per_run":3,"exception_minutes":12}' \| python3 -c "import sys,json; print(json.load(sys.stdin)['likely_hours_saved'])"` | Positive float (e.g. 9.8) | ☐ |
| C7 | **P0** | Forecast validation | `curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:8000/api/forecast -H 'Content-Type: application/json' -d '{"eligible_runs":-1,"manual_minutes_per_run":18,"review_minutes_per_run":3,"exception_minutes":12}'` | `422` | ☐ |
| C8 | **P0** | Effectiveness | `curl -s http://127.0.0.1:8000/api/effectiveness \| python3 -c "import sys,json; e=json.load(sys.stdin); print(e['overall_score'], e['safety_status'])"` | Score + status | ☐ |
| C9 | **P0** | Activate | `curl -s -X POST http://127.0.0.1:8000/api/activate-automation \| python3 -c "import sys,json; a=json.load(sys.stdin); print(a['run']['status'], len(a['proposed_slots']))"` | `completed 3` (typical) | ☐ |
| C10 | **P0** | Watcher scan | `curl -s -X POST http://127.0.0.1:8000/api/watcher/scan \| python3 -c "import sys,json; r=json.load(sys.stdin); print(r['data_source'], r['notification_count'])"` | `demo` or `imap`; count ≥ 1 | ☐ |
| C11 | **P0** | Bootstrap | `curl -s -X POST http://127.0.0.1:8000/api/prototype/bootstrap \| python3 -c "import sys,json; b=json.load(sys.stdin); print(b['workflow_name'], len(b['notifications']))"` | Name; notifications ≥ 1 | ☐ |
| C12 | **P0** | Notifications | `curl -s http://127.0.0.1:8000/api/notifications \| python3 -c "import sys,json; print(len(json.load(sys.stdin)))"` | ≥ 1 after bootstrap | ☐ |
| C13 | P1 | Watcher status | `curl -s http://127.0.0.1:8000/api/watcher/status \| python3 -c "import sys,json; s=json.load(sys.stdin); print(s.get('last_error'), s.get('data_source'))"` | `None` + source if IMAP configured | ☐ |
| C14 | P1 | IMAP configured | `curl -s http://127.0.0.1:8000/api/ingest/status \| python3 -c "import sys,json; print(json.load(sys.stdin)['imap_configured'])"` | Matches `.env` expectation | ☐ |
| C15 | P2 | Clear uploads | `curl -s -X DELETE http://127.0.0.1:8000/api/ingest/uploads` | `{"cleared":true}` | ☐ |
| C16 | P2 | Calendar `.ics` upload | See [DEMO.md § Optional .ics test](./DEMO.md#optional-ics-calendar-upload-test) | `event_count` ≥ 1 | ☐ |

### Layer 2 — pytest (automated, ~1 min)

```bash
cd backend
source .venv/bin/activate   # or use .venv/bin/python -m pytest
pip install -r requirements.txt
pytest -q
```

| ID | P0 | Suite | Covers | Expected | Pass |
|---|---|---|---|---|---|
| P1 | **P0** | Full suite | All `backend/tests/test_*.py` | 0 failures (47+ tests) | ☐ |
| P2 | **P0** | `test_prototype.py` | Bootstrap, notifications, automate | Pass | ☐ |
| P3 | **P0** | `test_watcher.py` | Watcher status + scan endpoints | Pass | ☐ |
| P4 | P1 | `test_ingestion.py` | Upload priority, ICS parse | Pass | ☐ |
| P5 | P1 | `test_calendar_service.py` | Slot finding | Pass | ☐ |
| P6 | P1 | `test_scoring.py` | Opportunity + effectiveness formulas | Pass | ☐ |
| P7 | P1 | `test_workflow.py` | Cursor/fallback extraction | Pass | ☐ |
| P8 | P2 | `test_engine.py` | SlothEngine facade | Pass | ☐ |

### Layer 3 — browser (E2E manual, ~10 min)

Prerequisites: `.env.local` with `VITE_API_BASE_URL=http://127.0.0.1:8000`; backend + `npm run dev` running.

| ID | P0 | Journey step | Route / action | Expected | Pass |
|---|---|---|---|---|---|
| B1 | **P0** | Landing loads | `/` | No console errors | ☐ |
| B2 | **P0** | Start prototype | `/setup` → Analyse | Network: `POST /api/prototype/bootstrap`, `POST /api/analyse-workflow` | ☐ |
| B3 | **P0** | Overview | `/overview` | Opportunity score + metrics visible | ☐ |
| B4 | **P0** | Notification bell | Header | Shows ≥ 1 notification after bootstrap | ☐ |
| B5 | **P0** | Automate flow | Click automate notification | `/automate/:id` → slots + draft reply on success | ☐ |
| B6 | P1 | Opportunity detail | `/opportunities/internal-meeting-scheduling` | Workflow diagram, forecast panel | ☐ |
| B7 | P1 | Activate from detail | Activate modal | `POST /api/activate-automation` in Network tab | ☐ |
| B8 | P1 | Effectiveness | `/insights` | Score breakdown renders | ☐ |
| B9 | P2 | Opportunities list | `/opportunities` | Mock inbox rows (expected) | ☐ |
| B10 | P1 | Mock fallback | Stop backend, reload setup | UI still works via mocks; console warns fallback | ☐ |

**DevTools check:** No failed requests to `127.0.0.1:8000` during P0 path (except intentional fallback test B10).

### Layer 4 — production / staging (~15 min)

Use deployed URLs or judge laptop with same ritual as local.

| ID | P0 | Check | Expected | Pass |
|---|---|---|---|---|
| R1 | **P0** | `GET {BACKEND}/health` | 200 + ok | ☐ |
| R2 | **P0** | CORS from frontend origin | No browser CORS errors on bootstrap | ☐ |
| R3 | **P0** | Full curl subset C1, C10, C11, C12 | Same as Layer 1 | ☐ |
| R4 | **P0** | Browser journey B1–B5 | Same as Layer 3 | ☐ |
| R5 | P1 | Secrets not in client bundle | No `IMAP_PASSWORD`, `CURSOR_API_KEY` in frontend | ☐ |
| R6 | P1 | HTTPS (if deployed) | Valid cert; mixed content none | ☐ |
| R7 | P2 | Cold start | API responds within 30s | ☐ |

---

## Bug log

| ID | Priority | Layer | Summary | Steps to reproduce | Owner | Status |
|---|---|---|---|---|---|---|
| BUG-001 | P0/P1/P2 | curl/pytest/browser/prod | | | | Open / Fixed |

---

## Sign-off

| Role | Name | Date | Layer 1 | Layer 2 | Layer 3 | Layer 4 | P0 clear |
|---|---|---|---|---|---|---|---|
| Member 3 (backend) | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| Member 1 (frontend) | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| Member 4 (QA/demo) | | | ☐ | ☐ | ☐ | ☐ | ☐ |

**Tag recommendation:** `git tag demo-ready` only when all **P0** rows pass on Layer 1–3 (Layer 4 if deploying).
