"""
Lead event bus.

Primary runtime path:
    website event -> emit_lead_event -> direct notifier -> Telegram

Events are still mirrored to backend/runtime/lead_events.jsonl for audit/debug,
but delivery does not depend on polling that file.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.services import telegram_notify

logger = logging.getLogger(__name__)

_EVENTS_FILE = Path(__file__).parent.parent.parent / "runtime" / "lead_events.jsonl"
_EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
_write_lock = asyncio.Lock()


async def emit_lead_event(event_type: str, payload: dict) -> None:
    event = {
        "event": event_type,
        "ts": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    logger.info("lead_event: %s %s", event_type, payload)

    if event_type == "new_message":
        asyncio.create_task(telegram_notify.notify_new_message(payload))
    elif event_type == "new_lead":
        asyncio.create_task(telegram_notify.notify_new_lead(payload))

    async with _write_lock:
        try:
            with _EVENTS_FILE.open("a", encoding="utf-8") as f:
                f.write(json.dumps(event, ensure_ascii=False) + "\n")
        except OSError as exc:
            logger.warning("lead_event: failed to write event file: %s", exc)
