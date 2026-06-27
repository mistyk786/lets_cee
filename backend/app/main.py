from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import activation, analysis, demo, opportunities, status

app = FastAPI()

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
app.include_router(opportunities.router)
app.include_router(status.router)


@app.get("/health")
def health():
    return {"status": "ok"}
