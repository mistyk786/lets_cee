"""Per-browser inbox sessions (IMAP app-password connect, no OAuth)."""

from __future__ import annotations

import imaplib
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

SESSION_HEADER = "x-sloth-session"
SESSION_TTL = timedelta(hours=8)

PROVIDER_PRESETS: dict[str, dict[str, str | int]] = {
    "gmail": {
        "imap_host": "imap.gmail.com",
        "imap_port": 993,
        "imap_mailbox": "INBOX",
        "sent_mailbox": "[Gmail]/Sent Mail",
    },
    "outlook": {
        "imap_host": "outlook.office365.com",
        "imap_port": 993,
        "imap_mailbox": "INBOX",
        "sent_mailbox": "Sent Items",
    },
    "icloud": {
        "imap_host": "imap.mail.me.com",
        "imap_port": 993,
        "imap_mailbox": "INBOX",
        "sent_mailbox": "Sent Messages",
    },
}


@dataclass
class InboxSession:
    session_id: str
    email: str
    imap_host: str
    imap_port: int
    imap_password: str
    imap_mailbox: str
    sent_mailbox: str | None
    provider: str
    created_at: datetime


_sessions: dict[str, InboxSession] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _purge_expired() -> None:
    cutoff = _now() - SESSION_TTL
    expired = [sid for sid, s in _sessions.items() if s.created_at < cutoff]
    for sid in expired:
        del _sessions[sid]


def _normalise_email(email: str) -> str:
    return email.strip().lower()


def _test_imap_login(
    *,
    email: str,
    password: str,
    imap_host: str,
    imap_port: int,
    mailbox: str,
) -> None:
    conn = imaplib.IMAP4_SSL(imap_host, imap_port)
    try:
        conn.login(email, password)  # type: ignore[arg-type]
        status, _ = conn.select(mailbox, readonly=True)
        if status != "OK":
            raise RuntimeError(f"Could not open mailbox {mailbox}")
    finally:
        try:
            conn.logout()
        except imaplib.IMAP4.error:
            logger.debug("IMAP logout failed during connect test", exc_info=True)


def connect_inbox(
    *,
    email: str,
    app_password: str,
    provider: str = "gmail",
) -> InboxSession:
    """Validate IMAP credentials and create an in-memory session."""
    _purge_expired()
    cleaned_email = _normalise_email(email)
    cleaned_password = app_password.replace(" ", "").strip()
    if not cleaned_email or not cleaned_password:
        raise ValueError("Email and app password are required")

    preset = PROVIDER_PRESETS.get(provider, PROVIDER_PRESETS["gmail"])
    imap_host = str(preset["imap_host"])
    imap_port = int(preset["imap_port"])
    mailbox = str(preset["imap_mailbox"])

    _test_imap_login(
        email=cleaned_email,
        password=cleaned_password,
        imap_host=imap_host,
        imap_port=imap_port,
        mailbox=mailbox,
    )

    session = InboxSession(
        session_id=secrets.token_urlsafe(32),
        email=cleaned_email,
        imap_host=imap_host,
        imap_port=imap_port,
        imap_password=cleaned_password,
        imap_mailbox=mailbox,
        sent_mailbox=str(preset["sent_mailbox"]) if preset.get("sent_mailbox") else None,
        provider=provider if provider in PROVIDER_PRESETS else "gmail",
        created_at=_now(),
    )
    _sessions[session.session_id] = session
    logger.info("Inbox session created for %s (%s)", cleaned_email, provider)
    return session


def disconnect_session(session_id: str) -> bool:
    return _sessions.pop(session_id, None) is not None


def get_session(session_id: str | None) -> InboxSession | None:
    if not session_id:
        return None
    _purge_expired()
    session = _sessions.get(session_id)
    if session is None:
        return None
    if session.created_at < _now() - SESSION_TTL:
        del _sessions[session_id]
        return None
    return session


def session_public_view(session: InboxSession) -> dict:
    local = session.email.split("@")[0]
    masked = f"{local[:2]}***@{session.email.split('@', 1)[-1]}"
    return {
        "connected": True,
        "email": session.email,
        "email_masked": masked,
        "provider": session.provider,
        "includes_sent_mail": bool(session.sent_mailbox),
        "session_expires_hours": int(SESSION_TTL.total_seconds() // 3600),
    }


def settings_for_session(session_id: str | None) -> Settings | None:
    session = get_session(session_id)
    if session is None:
        return None
    base = get_settings()
    return base.model_copy(
        update={
            "imap_host": session.imap_host,
            "imap_port": session.imap_port,
            "imap_user": session.email,
            "imap_password": session.imap_password,
            "imap_mailbox": session.imap_mailbox,
            "imap_sent_mailbox": session.sent_mailbox,
        }
    )


def sent_mailbox_for_session(session_id: str | None) -> str | None:
    session = get_session(session_id)
    return session.sent_mailbox if session else None
