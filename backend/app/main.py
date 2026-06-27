from fastapi import FastAPI

from app.routers import activation, analysis, demo

app = FastAPI()

app.include_router(demo.router)
app.include_router(analysis.router)
app.include_router(activation.router)


@app.get("/health")
def health():
    return {"status": "ok"}
