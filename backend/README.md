# Sloth.ai — AI / Scoring Engine (Member 2)

Production-ready Python package that sits between Member 3's data layer and
Member 1's frontend. It detects repeated email→calendar workflows, proposes
automations, forecasts time saved, and scores effectiveness.

This is **not** the HTTP API layer (Member 3) and **not** the UI (Member 1).
It is an installable, deployable engine that Member 3 imports and exposes via
their own routes.

---

## Architecture

```text
Member 3 (FastAPI / data ingestion)
        │
        │  email_threads: list[dict]
        ▼
┌───────────────────────────────────────┐
│  SlothEngine  (this package)          │
│  ├── detect_workflow()                │
│  ├── propose_automation()             │
│  ├── forecast()                       │
│  ├── score_effectiveness()            │
│  └── analyze()  → AnalysisResult JSON │
└───────────────────────────────────────┘
        │
        │  Pydantic JSON contracts
        ▼
Member 1 (frontend diagrams + scores)
```

### Package layout

```text
backend/
  app/
    __init__.py          Public exports
    __main__.py          CLI (health + analyze)
    engine.py            SlothEngine facade — integration entry point
    schemas.py           Shared JSON contracts (source of truth)
    config.py            Environment-backed settings
    constants.py         Scoring weights and version
    exceptions.py        Domain errors
    services/
      workflow_service.py
      scoring_service.py
      automation_service.py
      demo_data.py
  tests/
  pyproject.toml         Installable package definition
  Dockerfile             Container for deployment / health probes
  .env.example           Environment template
```

---

## Quick start

### Install (editable, for development)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # add OPENAI_API_KEY when ready
```

### Run tests

```bash
pytest
```

### CLI (health check + local analysis)

```bash
python -m app health
python -m app analyze --demo --pretty
python -m app analyze --demo-mode --auto-forecast --pretty
```

### Docker

```bash
docker build -t sloth-engine .
docker run --rm -e OPENAI_API_KEY=sk-... sloth-engine health
docker run --rm sloth-engine analyze --demo --pretty
```

---

## Integration guide (Member 3)

Import the engine in your FastAPI service:

```python
from app import SlothEngine
from app.schemas import ForecastInputs, EffectivenessInputs

engine = SlothEngine()

@app.get("/health/engine")
def engine_health():
    return engine.health().model_dump()

@app.post("/api/analyze")
def analyze(threads: list[dict]):
    return engine.analyze(
        threads,
        auto_forecast=True,
    ).model_dump()

@app.post("/api/analyze/demo")
def analyze_demo():
    return engine.demo_analysis().model_dump()
```

### Explicit demo mode (no OpenAI call)

```python
workflow = engine.detect_workflow(threads, demo_mode=True)
```

### Fallback behaviour

If OpenAI is unavailable or returns invalid JSON, `detect_workflow()` silently
returns demo data so the product never breaks during a live demo.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | — | Required for live LLM extraction |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model for workflow detection |
| `OPENAI_MAX_TOKENS` | `1500` | Max tokens per LLM call |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `SLOTH_ENV` | `development` | Shown in health checks |

See `.env.example` for a copy-paste template.

---

## Data contracts

All shared models live in `app/schemas.py`. **Do not rename fields** without
telling the team — Member 1 and Member 3 depend on these shapes.

Key models:

| Model | Purpose |
|---|---|
| `DetectedWorkflow` | Detected pattern + steps + bottlenecks + proposal |
| `ForecastMetrics` | Time-saved forecast (conservative / likely / optimistic) |
| `EffectivenessMetrics` | Post-automation score breakdown |
| `AnalysisResult` | Full pipeline output for a single API response |
| `HealthStatus` | Deployment readiness probe |

---

## Deployment checklist

- [ ] `pip install .` or Docker build succeeds
- [ ] `python -m app health` returns JSON with `status: ok` (or `degraded` if no key)
- [ ] `pytest` passes (38+ tests)
- [ ] `OPENAI_API_KEY` set in production environment
- [ ] Member 3 wraps `SlothEngine.analyze()` behind HTTP routes
- [ ] Member 1 consumes `AnalysisResult.model_dump()` JSON

---

## Scope boundary (Member 2)

**In scope:** schemas, workflow analysis, scoring, automation proposals, demo
fallbacks, config, health checks, CLI, Docker packaging.

**Out of scope:** HTTP routes, Gmail/Outlook ingestion, email sending, calendar
API calls, database, frontend.
