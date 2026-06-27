from fastapi import FastAPI

from app.routers import analysis, demo

app = FastAPI()

app.include_router(demo.router)
app.include_router(analysis.router)


@app.get("/health")
def health():
    return {"status": "ok"}
