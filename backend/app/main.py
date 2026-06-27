from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.engine import SlothEngine
from app.request_context import (
    set_effective_settings,
    set_inbox_context_key,
)
from app.routers import activation, analysis, demo, ingestion, notifications
from app.services import inbox_watcher
from app.services.session_service import SESSION_HEADER, settings_for_session


@asynccontextmanager
async def lifespan(_app: FastAPI):
    inbox_watcher.start()
    yield
    inbox_watcher.stop()


app = FastAPI(lifespan=lifespan)

_settings = get_settings()


@app.middleware("http")
async def attach_inbox_session(request: Request, call_next):
    mode = request.headers.get("x-sloth-inbox-mode", "demo").lower()
    session_id = request.headers.get(SESSION_HEADER)
    if mode == "own" and session_id:
        set_inbox_context_key(session_id)
        set_effective_settings(settings_for_session(session_id))
    else:
        set_inbox_context_key("demo")
        set_effective_settings(None)
    try:
        return await call_next(request)
    finally:
        set_inbox_context_key("demo")
        set_effective_settings(None)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(demo.router)
app.include_router(analysis.router)
app.include_router(activation.router)
app.include_router(notifications.router)
app.include_router(ingestion.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/engine/health")
def engine_health():
    """SlothEngine readiness (Cursor configured, version, environment)."""
    return SlothEngine().health()
