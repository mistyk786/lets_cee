from fastapi import APIRouter, HTTPException, UploadFile

from app.models import EmailMessage
from app.services import ingestion_service

router = APIRouter()


@router.get("/api/ingest/status")
def ingest_status() -> dict:
    """Report which data sources are configured (Cursor, IMAP, uploads)."""
    return ingestion_service.ingestion_status()


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
