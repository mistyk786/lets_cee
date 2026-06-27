from fastapi import APIRouter
from pydantic import BaseModel

from app.models import ActivationResponse
from app.schemas import AutomationRule
from app.services import activation_service

router = APIRouter()


class IncomingEmail(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str
    requested_duration_minutes: int | None = None


class ActivationRequest(BaseModel):
    rules: AutomationRule | None = None
    incoming_email: IncomingEmail | None = None


@router.post("/api/activate-automation", response_model=ActivationResponse)
def activate_automation(
    request: ActivationRequest | None = None,
) -> ActivationResponse:
    request = request or ActivationRequest()
    email = (
        request.incoming_email.model_dump()
        if request.incoming_email is not None
        else None
    )
    return activation_service.activate(request.rules, email)
