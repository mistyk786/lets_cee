from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import activation, analysis, demo, ingestion, notifications
from app.services import inbox_watcher


@asynccontextmanager
async def lifespan(_app: FastAPI):
    inbox_watcher.start()
    yield
    inbox_watcher.stop()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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
