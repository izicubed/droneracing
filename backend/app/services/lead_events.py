"""
Lead event bus (MVP).

Usage:
    from app.services.lead_events import emit_lead_event

    await emit_lead_event("new_lead", {"lead_id": 1, "conversation_id": "..."})

Events are logged and appended to backend/runtime/lead_events.jsonl.
This file is a future integration point — external services (e.g. Serik's relay)
can tail it to receive real-time notifications.

Supported event types:
    new_conversation  — first message in a session
    new_message       — any subsequent user message
    new_lead          — lead record created
    lead_updated      — lead fields changed by admin
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from app.services import telegram_notify

logger = logging.getLogger(__name__)

_EVENTS_FILE = Path(__file__).parent.parent.parent / "runtime" / "lead_events.jsonl"

# Ensure the runtime directory exists at import time
_EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)

# Lock to avoid interleaved writes in async context
_write_lock = asyncio.Lock()


async def emit_lead_event(event_type: str, payload: dict) -> None:
    """
    Emit a lead event: log it and append to lead_events.jsonl.

    Args:
        event_type: one of new_conversation, new_message, new_lead, lead_updated
        payload: arbitrary dict with event details
    """
    event = {
        "event": event_type,
        "ts": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    logger.info("lead_event: %s %s", event_type, payload)

    # Telegram notifications (fire-and-forget; never raises)
    if event_type == "new_message":
        asyncio.ensure_future(telegram_notify.notify_new_message(payload))
    elif event_type == "new_lead":
        asyncio.ensure_future(telegram_notify.notify_new_lead(payload))

    async with _write_lock:
        try:
            with _EVENTS_FILE.open("a", encoding="utf-8") as f:
                f.write(json.dumps(event, ensure_ascii=False) + "\n")
        except OSError as exc:
            logger.warning("lead_event: failed to write event file: %s", exc)
