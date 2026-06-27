from fastapi import APIRouter

from app.models import DemoDataResponse, EmailMessage
from app.services import ingestion_service
from app.services.dataset_service import load_demo_data
from app.services.email_normaliser import normalise_threads
from app.services.imap_service import imap_configured

router = APIRouter()

_SUMMARY_MAX_MESSAGES = 25


@router.get("/api/demo-data", response_model=DemoDataResponse)
def get_demo_data() -> DemoDataResponse:
    """Return emails + calendar for the setup screen (live IMAP when configured)."""
    base = load_demo_data()

    if imap_configured():
        try:
            raw, source = ingestion_service.get_raw_emails(
                prefer_live=True,
                scheduling_only=False,
                max_messages=_SUMMARY_MAX_MESSAGES,
                headers_only=True,
            )
            threads = normalise_threads(raw)
            emails = [EmailMessage(**item) for item in raw]
            return DemoDataResponse(
                emails=emails,
                calendar_events=base.calendar_events,
                data_source=source,
                thread_count=len(threads),
            )
        except RuntimeError as exc:
            meta = ingestion_service.get_last_ingestion_meta()
            return DemoDataResponse(
                emails=[],
                calendar_events=base.calendar_events,
                data_source=meta.get("data_source", "imap"),
                thread_count=0,
                ingest_error=str(exc),
            )

    threads = normalise_threads([e.model_dump() for e in base.emails])
    return DemoDataResponse(
        emails=base.emails,
        calendar_events=base.calendar_events,
        data_source="demo",
        thread_count=len(threads),
    )
