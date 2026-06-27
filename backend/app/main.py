from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.engine import SlothEngine
from app.routers import activation, analysis, demo, ingestion, notifications
from app.services import inbox_watcher


@asynccontextmanager
async def lifespan(_app: FastAPI):
    inbox_watcher.start()
    yield
    inbox_watcher.stop()


app = FastAPI(lifespan=lifespan)

_settings = get_settings()
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
