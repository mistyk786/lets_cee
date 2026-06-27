# SLOTH

> Turn repetitive work into safe, measurable automations.

SLOTH is an AI workflow assistant that learns from approved email and calendar
activity, detects repeated work, recommends smarter workflows, and proves
whether automation is saving time.

This repository contains the **frontend** experience. It is fully functional
end-to-end using **mock data** and an **API-ready abstraction layer** — no
backend, OAuth, database, or real AI is required to run the complete demo.

---

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | React 18 + TypeScript                   |
| Build tool     | Vite 5                                   |
| Styling        | Tailwind CSS 3 (custom SLOTH theme)     |
| Routing        | React Router 6                          |
| Animation      | Framer Motion                           |
| Icons          | lucide-react                            |
| Diagrams       | Custom, dependency-free node-and-arrow  |

---

## How to run

```bash
npm install
npm run dev        # http://localhost:5173 (opens automatically)
```

Other scripts:

```bash
npm run build      # type-check + production build to /dist
npm run preview    # serve the production build
npm run lint       # tsc --noEmit type check
```

---

## The demo journey (works with no backend)

Both required user journeys lead to the same reusable opportunity-detail
experience (`detect → design → optimise → measure`):

1. **Landing page** (`/`) → **Use Demo Dataset**
2. **Setup** (`/setup`) → **Analyse Workflow** (animated loading state)
3. **Overview** (`/overview`) → opportunity score + key metrics
4. **Opportunities** (`/opportunities`) → seeded inbox + a proactive
   "new opportunity" notification (also in the header bell)
5. **Opportunity detail** (`/opportunities/:id`) → evidence, current workflow
   diagram, automation readiness, **proposed automation dataflow**, **editable
   rules** (live rule summary), and **forecast**
6. **Activate Automation** → confirmation modal → success state with a
   *simulated* next action
7. **Active Automations** (`/automations`)
8. **Measure Impact** (`/insights` or `/effectiveness/:id`) → effectiveness
   score, breakdown, safety panel, recommendation

The **SLOTH Assistant** (header button / slide-over panel) is context-aware: it
changes its message per screen using pre-seeded content (not a generic chatbot).

---

## Project structure

```
src/
  lib/
    types.ts        # Shared TS contracts (the future API's data shapes)
    mockData.ts     # All seeded business data lives here (not in components)
    api.ts          # API adapter — swap mock bodies for fetch() to go live
    utils.ts        # Formatting, rule-summary builder, score bands
  context/
    AppContext.tsx  # Activation, notifications, per-opportunity draft rules
  components/
    ui/             # Button, Card, Badge, Modal, Tooltip, Progress, etc.
    layout/         # AppShell, Header, Sidebar, StepProgress
    assistant/      # SlothAssistantPanel, AssistantInsightCard, NotificationBell
    landing/        # ValueCard, WorkflowPreview
    opportunities/  # OpportunityCard, DetectionEvidence
    workflows/      # WorkflowDiagram, WorkflowNode, BottleneckCard
    automations/    # AutomationRulesPanel, AutomationRuleSummary,
                    # ActivationModal, ActiveAutomationCard
    metrics/        # MetricCard, ScoreBreakdown, ForecastPanel, SafetyStatusCard
  pages/            # One file per screen
```

---

## Mock-data assumptions

All mock data is in `src/lib/mockData.ts`. Key assumptions:

- **Flagship workflow:** _Internal Meeting Scheduling_ — 45 runs/month,
  12 manual min/run, 2.8-day cycle time, 4.2 emails/meeting, ~9 hrs/month,
  opportunity score **87/100**.
- **Proactive example:** _Meeting Rescheduling_ — 8/week, 91% pattern
  confidence, ~48 min/week recoverable. This drives the header notification.
- Two lighter inbox items: _Weekly project reminders_ and
  _Post-meeting follow-ups_.
- **Effectiveness** (after activation): overall **87/100**, 300/330 forecast
  minutes realised, 32/40 coverage, 30/32 reliable runs, 1/32 corrections,
  2.8 → 1.0 day cycle time, 88% acceptance, no safety incidents.
- A small simulated latency (~350 ms, longer for "analyse") makes loading and
  empty/error states demonstrable.
- "Today" is anchored to 2026-06-27 for stable relative dates in the demo.

### Built-in safety rule

If `EffectivenessMetrics.safetyStatus` is `"needs_review"` (e.g. a
wrong-recipient action, privacy issue, major calendar conflict, or repeated
failure appears in `safetyIncidents`), the Measure Impact screen:

- shows the automation as **Needs review**, and
- **suppresses any recommendation to expand** the automation.

To demo this, set `effectivenessMetrics.safetyStatus = "needs_review"` and add a
critical entry to `safetyIncidents`.

---

## Expected backend API contracts

The UI only talks to `src/lib/api.ts`. Each method returns a typed shape from
`src/lib/types.ts`. To go live, replace each mock body with a `fetch` to the
matching endpoint (also listed in `ENDPOINTS`):

| UI method (`api.*`)            | Method & endpoint                          | Returns / body                        |
| ------------------------------ | ------------------------------------------ | ------------------------------------- |
| `getDemoData()`                | `GET  /api/demo-data`                      | `DemoDataset`                         |
| `analyseWorkflow()`            | `POST /api/analyse-workflow`               | `OverviewSummary`                     |
| `getOverview()`                | `GET  /api/effectiveness` (overview)       | `OverviewSummary`                     |
| `getOpportunities()`           | `GET  /api/opportunities`                  | `OptimisationOpportunity[]`           |
| `getOpportunity(id)`           | `GET  /api/opportunities/{id}`             | `OptimisationOpportunity`             |
| `generateAutomation(id,rules)` | `POST /api/generate-automation`            | `AutomationRule`                      |
| `forecast(id, rules)`          | `POST /api/forecast`                       | `Forecast` (body: `AutomationRule`)   |
| `activateAutomation(id,rules)` | `POST /api/opportunities/{id}/activate`    | `ActiveAutomation`                    |
| `getActiveAutomations()`       | `GET  /api/opportunities` (active filter)  | `ActiveAutomation[]`                  |
| `pauseAutomation(id)`          | `POST /api/opportunities/{id}/pause`       | `{ ok: true }`                        |
| `getEffectiveness(id?)`        | `GET  /api/opportunities/{id}/metrics`     | `EffectivenessMetrics`                |
| `getNotifications()`           | `GET  /api/notifications`                  | `SlothNotification[]`                 |

Additional documented endpoints reserved for the backend:
`POST /api/opportunities/{id}/review`, `POST /api/opportunities/{id}/configure`.

Because the adapter is the only seam, **no UI component imports mock data
directly** — swapping to real endpoints requires changes only in `api.ts`.

---

## Out of scope (intentionally not built)

Gmail/Calendar OAuth, real monitoring or tracking, real email sending / calendar
writes, auth, databases, PDF export, drag-and-drop workflow editing, and generic
chatbot functionality. The product deliberately ships **one excellent workflow**:
internal meeting scheduling & rescheduling.

---

## Unresolved decisions for the team

- **Auth & multi-tenant:** no account model yet; `AppContext` holds session-only
  state. A real app needs user/org scoping on every endpoint.
- **Notification transport:** currently polled once via `getNotifications()`.
  Real continuous discovery likely wants websockets/SSE.
- **Score formulas:** opportunity/effectiveness scores are seeded. The AI team
  should define the real scoring model behind the same fields.
- **Forecast model:** `previewSavings()` in `utils.ts` is a simple placeholder
  so rule edits feel responsive; replace with the backend `POST /api/forecast`.
