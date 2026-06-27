# SLOTH Frontend Integration Guide

Member 1 integration reference: how the React app talks to the FastAPI backend,
where types live, and what “done” looks like.

---

## File map

| Path | Role |
|------|------|
| `src/lib/http.ts` | `fetchWithFallback`, `isBackendConfigured()`, `getApiBaseUrl()` |
| `src/lib/api.ts` | **Single API seam** — `ENDPOINTS`, `api.*` methods, session cache |
| `src/lib/mappers.ts` | snake_case → camelCase adapters (no UI imports) |
| `src/lib/backend/types.ts` | Backend JSON contracts (snake_case only) |
| `src/lib/types.ts` | Frontend contracts (camelCase — used by all components) |
| `src/lib/mockData.ts` | Fallback/demo seed data |
| `src/lib/utils.ts` | Formatting, `previewSavings()`, score bands |
| `src/context/AppContext.tsx` | Session state, notifications, **15s watcher poll** |
| `src/vite-env.d.ts` | `VITE_*` env type declarations |
| `.env.example` / `.env.local` | Local env (not committed) |
| `src/components/layout/WatcherStatusPanel.tsx` | Live/demo/offline status UI |
| `src/pages/SetupPage.tsx` | Demo bootstrap + compact status panel |
| `src/pages/OverviewPage.tsx` | Post-analysis summary + status panel |
| `src/pages/OpportunitiesPage.tsx` | Opportunity list (still mock list) |
| `src/pages/OpportunityDetailPage.tsx` | Configure → forecast → activate |
| `src/pages/ActiveAutomationsPage.tsx` | Activated automations (not `AutomatePage`) |
| `src/pages/EffectivenessPage.tsx` | Effectiveness metrics |
| `vercel.json` | Vercel static deploy (`dist/`) |

**Rule:** UI components import `@/lib/types` and call `api` only — never `mockData` or `backend/types`.

---

## `VITE_*` env vars & build-time behaviour

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_API_BASE_URL` | _(empty)_ | Backend origin, e.g. `http://127.0.0.1:8000`. No trailing slash. |
| `VITE_USE_MOCK_API` | _(unset)_ | When `"true"`, **all** `fetchWithFallback` calls skip network and use mocks. |
| `VITE_WATCHER_POLL_MS` | `15000` | How often `AppContext` polls `api.getWatcherStatus()`. |

**Vite rules:**

- Only variables prefixed with `VITE_` are exposed to client code via `import.meta.env`.
- Values are **inlined at build time** — changing `.env.local` on Vercel requires a **redeploy**.
- Use `.env.local` for local dev (gitignored). Use Vercel project env vars for production.

```bash
cp .env.example .env.local
# edit VITE_API_BASE_URL, restart: npm run dev
```

---

## `ENDPOINTS` & integration surface (`api.ts`)

```ts
export const ENDPOINTS = {
  demoData: "/api/demo-data",
  analyseWorkflow: "/api/analyse-workflow",
  generateAutomation: "/api/generate-automation",
  forecast: "/api/forecast",
  activateAutomation: "/api/activate-automation",
  effectiveness: "/api/effectiveness",
  watcherStatus: "/api/watcher/status",   // GET — inbox poll state
  ingestStatus: "/api/ingest/status",     // GET — IMAP / upload / demo flags
  opportunities: "/api/opportunities",
  opportunity: (id) => `/api/opportunities/${id}`,
  notifications: "/api/notifications",
  // reserved: review, configure, activate, pause, metrics
};
```

### Wired today

| `api.*` | HTTP | Fallback |
|---------|------|----------|
| `getDemoData()` | GET `/api/demo-data` | `mockData.demoDataset` |
| `analyseWorkflow()` | POST `/api/analyse-workflow` | `overviewSummary` + caches workflow |
| `getOverview()` | cached analysis or above | mock overview |
| `getOpportunity(id)` | GET `/api/opportunities/:id` | mock + cached workflow merge |
| `generateAutomation(id)` | POST `/api/generate-automation` | mock proposed steps |
| `forecast(id, rules)` | POST `/api/forecast` | `previewSavings()` blend |
| `activateAutomation(id, rules)` | POST `/api/activate-automation` | mock automation + preview |
| `getEffectiveness()` | GET `/api/effectiveness` | mock effectiveness |
| `getWatcherStatus()` | GET `/api/watcher/status` + `/api/ingest/status` | mock / offline |

### Still mock-only

`getOpportunities()`, `getNotifications()`, `getActiveAutomations()`, `pauseAutomation()`, assistant insights.

### 15s watcher poll

`AppContext` on mount:

```ts
refreshWatcherStatus();
setInterval(refreshWatcherStatus, WATCHER_POLL_MS); // default 15_000
```

`getWatcherStatus()` sets `connectionMode`:

- **`mock`** — no `VITE_API_BASE_URL` or `VITE_USE_MOCK_API=true`
- **`live`** — backend reachable
- **`offline`** — URL set but fetch failed

Displayed on **Setup** (compact) and **Overview** via `WatcherStatusPanel`.

---

## snake_case → camelCase mapping

| Backend (`schemas.py` / API JSON) | Frontend (`types.ts`) | Mapper |
|-----------------------------------|----------------------|--------|
| `workflow_name` | `workflowName` | `mapOverviewSummary`, `mapDetectedWorkflowToOpportunity` |
| `occurrence_count` | `frequency.value` | opportunity mapper |
| `opportunity_score` | `scores.opportunityScore` | opportunity mapper |
| `current_steps[]` | `currentWorkflow[]` | `mapWorkflowStep` |
| `automation_proposal[]` | `proposedWorkflow[]` | `mapProposedStep` |
| `step_id` | `id` | workflow steps |
| `is_manual` | `actor` / `kind` | workflow steps |
| `avg_minutes` | `durationMinutes` | workflow steps |
| `requires_approval` | `kind: "approval"` | proposed steps |
| `internal_contacts_only` | `internalOnly` | `mapAutomationRule` / `toBackendAutomationRule` |
| `meeting_duration_minutes` | `meetingDuration` | rules |
| `working_hours_start` | `workingHoursStart` | rules |
| `approval_required` | `approvalMode` | rules (`draft` vs `approval_required`) |
| `max_slots_proposed` | `maxSuggestedSlots` | rules |
| `conservative_hours_saved` | `conservativeHours` | `mapForecast` |
| `likely_hours_saved` | `likelyHours` | `mapForecast` |
| `optimistic_hours_saved` | `optimisticHours` | `mapForecast` |
| `safety_status: "ok"` | `safetyStatus: "healthy"` | `mapEffectiveness` |
| `safety_status: "needs_review"` | `safetyStatus: "needs_review"` | `mapEffectiveness` |
| `overall_score` | `overallScore` | `mapEffectiveness` |
| `recommendation` | _(not yet in UI)_ | TODO |
| `draft_reply` | `preview.draftReply` | `mapActivationResponse` |
| `proposed_slots` | `preview.proposedSlots` | activation |
| `tentative_event.title` | `preview.tentativeEventTitle` | activation |
| `emails` / `calendar_events` | `DemoDataset.summary` | `mapDemoDataRaw` |
| `data_source` | `WatcherStatus.dataSource` | `mapWatcherStatus` |
| `last_scan_at` | `lastScanAt` | `mapWatcherStatus` |
| `imap_configured` | `imapConfigured` | `mapWatcherStatus` |

---

## Vercel deploy

| Setting | Value |
|---------|-------|
| **Root directory** | `.` (repo root — **not** `src/`) |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Framework** | Vite (or Other + above) |

`vercel.json` at repo root configures SPA rewrites to `index.html`.

**Production env (Vercel dashboard):**

```
VITE_API_BASE_URL=https://your-backend.example.com
```

Backend must allow CORS for your Vercel origin. Frontend-only deploy works in demo mode without it.

---

## Definition of done

### Core integration

- [ ] `.env.local` has `VITE_API_BASE_URL` pointing at running backend
- [ ] `npm run build` passes with zero TS errors
- [ ] Setup → Analyse uses live `POST /api/analyse-workflow` (check Network tab)
- [ ] Overview shows scores from live analysis, not only mock seed
- [ ] Opportunity detail forecast updates via `POST /api/forecast`
- [ ] Activation shows backend `draft_reply` / slots when returned
- [ ] Effectiveness loads from `GET /api/effectiveness`

### Watcher / status

- [x] `BackendWatcherStatus` + `WatcherStatus` types
- [x] `api.getWatcherStatus()` with mock / live / offline modes
- [x] `AppContext` polls every **15s** (`WATCHER_POLL_MS`)
- [x] `WatcherStatusPanel` on Setup + Overview
- [ ] Backend exposes `GET /api/watcher/status` (returns 200 with expected fields)
- [ ] Panel shows **IMAP** when `imap_configured: true`

### Deploy

- [ ] Vercel project: root `.`, output `dist`
- [ ] `VITE_API_BASE_URL` set in Vercel env
- [ ] Production URL loads and status panel shows **Live backend**

### Nice-to-have

- [ ] `getOpportunities()` derives from cached `lastDetectedWorkflow`
- [ ] Surface `recommendation` on Effectiveness page
- [ ] `sessionStorage` persist analysis across refresh
- [ ] Header badge: Demo / Live / Offline

---

## Local dev checklist

```bash
# Terminal 1 — backend (Python 3.11+)
cd backend && .venv/bin/uvicorn app.main:app --reload

# Terminal 2 — frontend
cp .env.example .env.local   # set VITE_API_BASE_URL
npm run dev
```

Open http://localhost:5173/setup — status panel should show **Demo mode** or **Live backend** depending on env.
