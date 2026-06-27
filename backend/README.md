# Sloth.ai — Backend (AI / Scoring Engine)

Everything between the raw data (Member 3's backend) and the UI (Member 1's
frontend): shared schemas, scoring logic, workflow analysis, and demo fallback
data.

## Layout

```text
backend/
  app/
    schemas.py                 # Pydantic v2 data contracts (source of truth)
    services/
      workflow_service.py      # extract_workflow() — OpenAI + safe fallback
      scoring_service.py       # opportunity / forecast / effectiveness scoring
      automation_service.py    # rule-based future-state proposal
      demo_data.py             # hardcoded demo fallbacks
  tests/
    test_scoring.py            # unit tests for the scoring functions
  requirements.txt
  pytest.ini
```

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment

The workflow extraction service calls OpenAI:

```bash
export OPENAI_API_KEY=sk-...
```

If the key is missing or the API/parse fails, `extract_workflow` falls back to
`load_demo_workflow()` so the demo never breaks.

## Run tests

```bash
cd backend
pytest
```

## Data contracts

See `app/schemas.py`. Field names are the shared contract with Members 1 and 3
— do not rename without telling the team.

Model: `Effectiveness Score` is capped at 40 and flagged `needs_review` when a
major error is present.
