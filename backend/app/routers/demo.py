from fastapi import APIRouter

from app.models import DemoDataResponse
from app.services.dataset_service import load_demo_data

router = APIRouter()


@router.get("/api/demo-data", response_model=DemoDataResponse)
def get_demo_data() -> DemoDataResponse:
    return load_demo_data()
