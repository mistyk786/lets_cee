from fastapi import APIRouter, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.models import EmailMessage
from app.services import ingestion_service
from app.services.session_service import (
    SESSION_HEADER,
    connect_inbox,
    disconnect_session,
    get_session,
    session_public_view,
)

router = APIRouter()


class InboxConnectRequest(BaseModel):
    email: str
    app_password: str = Field(min_length=8)
    provider: str = "gmail"


@router.get("/api/inbox/session")
def inbox_session(
    x_sloth_session: str | None = Header(default=None, alias="X-Sloth-Session"),
) -> dict:
    """Return connected inbox info for the current browser session."""
    session = get_session(x_sloth_session)
    if session is None:
        return {"connected": False}
    return session_public_view(session)


@router.post("/api/inbox/connect")
def inbox_connect(body: InboxConnectRequest) -> dict:
    """Connect a user's inbox via IMAP app password (session-scoped, in-memory)."""
    try:
        session = connect_inbox(
            email=body.email,
            app_password=body.app_password,
            provider=body.provider,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Could not sign in to that mailbox. Check email, app password, and provider.",
        ) from exc

    return {
        "session_id": session.session_id,
        SESSION_HEADER: session.session_id,
        **session_public_view(session),
    }


@router.post("/api/inbox/disconnect")
def inbox_disconnect(
    x_sloth_session: str | None = Header(default=None, alias="X-Sloth-Session"),
) -> dict:
    if not x_sloth_session:
        return {"disconnected": False}
    return {"disconnected": disconnect_session(x_sloth_session)}


@router.get("/api/ingest/status")
def ingest_status() -> dict:
    """Report which data sources are configured (Cursor, IMAP, uploads)."""
    return ingestion_service.ingestion_status()


@router.get("/api/inbox/recent")
def recent_inbox(limit: int = 10) -> dict:
    """Recent inbox messages for the dashboard (IMAP, upload, or demo)."""
    emails, source = ingestion_service.list_recent_emails(
        limit=min(max(limit, 1), 20)
    )
    return {
        "data_source": source,
        "count": len(emails),
        "emails": emails,
    }


@router.post("/api/ingest/emails")
def ingest_emails(emails: list[EmailMessage]) -> dict:
    """Upload exported or pasted emails as JSON (no Gmail OAuth required)."""
    if not emails:
        raise HTTPException(status_code=400, detail="At least one email is required")
    ingestion_service.set_uploaded_emails([email.model_dump() for email in emails])
    threads, source = ingestion_service.get_email_threads(prefer_live=True)
    return {
        "source": source,
        "email_count": len(emails),
        "thread_count": len(threads),
    }


@router.post("/api/ingest/calendar")
async def ingest_calendar(file: UploadFile) -> dict:
    """Upload an exported ``.ics`` calendar file for slot-finding."""
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    events = ingestion_service.parse_ics_events(text)
    if not events:
        raise HTTPException(status_code=400, detail="No calendar events found in file")

    ingestion_service.set_uploaded_calendar(events)
    return {"source": "upload", "event_count": len(events)}


@router.delete("/api/ingest/uploads")
def clear_uploads() -> dict:
    ingestion_service.clear_uploads()
    return {"cleared": True}
