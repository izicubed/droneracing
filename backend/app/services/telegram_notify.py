"""
Telegram notification service (MVP).

Sends plain-text notifications to a Telegram chat via Bot API.
Requires TELEGRAM_NOTIFY_BOT_TOKEN and TELEGRAM_NOTIFY_CHAT_ID env vars.
If not set — logs a warning on first use and silently skips sending.
"""

import hashlib
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"

# Dedup: last fingerprint per (conversation_id, event_type)
_last_fingerprint: dict[str, str] = {}

# Important answer heuristics
_IMPORTANT_KEYWORDS = (
    "цена", "стоит", "₽", "телефон", "заказ",
    "оформить", "комплект", "могу подобрать",
    "могу подсказать", "уточните",
)
_IMPORTANT_LENGTH = 180


# ---------------------------------------------------------------------------
# Heuristics
# ---------------------------------------------------------------------------

def is_important_answer(text: str) -> bool:
    """Return True if Andrey's reply looks significant enough to notify."""
    if len(text) > _IMPORTANT_LENGTH:
        return True
    text_lower = text.lower()
    return any(kw in text_lower for kw in _IMPORTANT_KEYWORDS)


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------

def _trunc(text: str | None, limit: int = 200) -> str:
    if not text:
        return "—"
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def format_new_message(payload: dict) -> str:
    lines = [
        "Новый диалог на сайте",
        f"Имя: {_trunc(payload.get('name'), 60)}",
        f"Телефон: {_trunc(payload.get('phone'), 30)}",
        f"Telegram: {_trunc(payload.get('telegram'), 40)}",
        f"Сообщение: {_trunc(payload.get('text_preview'), 200)}",
    ]
    return "\n".join(lines)


def format_new_lead(payload: dict) -> str:
    lines = [
        "Новый лид",
        f"Имя: {_trunc(payload.get('name'), 60)}",
        f"Телефон: {_trunc(payload.get('phone'), 30)}",
        f"Telegram: {_trunc(payload.get('telegram'), 40)}",
        f"Состав: {_trunc(payload.get('product'), 120)}",
        f"Комментарий: {_trunc(payload.get('order_summary') or payload.get('notes'), 160)}",
        f"Статус: {payload.get('status', 'new')}",
    ]
    return "\n".join(lines)


def format_important_answer(payload: dict) -> str:
    lines = [
        "Андрей ответил клиенту",
        f"Кому: {_trunc(payload.get('name') or payload.get('conversation_id'), 60)}",
        f"Ответ: {_trunc(payload.get('answer'), 300)}",
        f"Риск: {payload.get('risk', 'важный ответ')}",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Dedup
# ---------------------------------------------------------------------------

def _fingerprint(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _is_duplicate(conversation_id: str, event_type: str, text: str) -> bool:
    key = f"{conversation_id}:{event_type}"
    fp = _fingerprint(text)
    if _last_fingerprint.get(key) == fp:
        return True
    _last_fingerprint[key] = fp
    return False


# ---------------------------------------------------------------------------
# Sender
# ---------------------------------------------------------------------------

async def send_telegram_message(text: str) -> bool:
    """
    Send a plain-text message to the configured Telegram chat.
    Returns True on success, False on any failure (never raises).
    """
    token = settings.telegram_notify_bot_token
    chat_id = settings.telegram_notify_chat_id

    if not token or not chat_id:
        logger.warning(
            "Telegram notifications disabled: TELEGRAM_NOTIFY_BOT_TOKEN or "
            "TELEGRAM_NOTIFY_CHAT_ID is not set."
        )
        return False

    url = _TELEGRAM_API.format(token=token)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "disable_web_page_preview": True,
                },
            )
        if resp.status_code == 200:
            return True
        logger.error(
            "Telegram API returned HTTP %d: %s",
            resp.status_code,
            resp.text[:300],
        )
        return False
    except httpx.TimeoutException:
        logger.error("Telegram API request timed out")
        return False
    except httpx.RequestError as exc:
        logger.error("Telegram API network error: %s", exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error sending Telegram message: %s", exc, exc_info=True)
        return False


# ---------------------------------------------------------------------------
# High-level helpers (called from event handlers)
# ---------------------------------------------------------------------------

async def notify_new_message(payload: dict) -> None:
    """Send notification for a new user message (deduped)."""
    conversation_id = payload.get("conversation_id", "")
    text = format_new_message(payload)
    if _is_duplicate(conversation_id, "new_message", text):
        logger.debug("telegram: skipping duplicate new_message for %s", conversation_id)
        return
    await send_telegram_message(text)


async def notify_new_lead(payload: dict) -> None:
    """Send notification when a new lead is created (deduped)."""
    conversation_id = payload.get("conversation_id", "")
    text = format_new_lead(payload)
    if _is_duplicate(conversation_id, "new_lead", text):
        logger.debug("telegram: skipping duplicate new_lead for %s", conversation_id)
        return
    await send_telegram_message(text)


async def notify_important_answer(payload: dict) -> None:
    """Send notification for a significant auto-reply from Andrey (deduped)."""
    conversation_id = payload.get("conversation_id", "")
    answer = payload.get("answer", "")
    if not is_important_answer(answer):
        return
    text = format_important_answer(payload)
    if _is_duplicate(conversation_id, "important_answer", text):
        logger.debug("telegram: skipping duplicate important_answer for %s", conversation_id)
        return
    await send_telegram_message(text)
