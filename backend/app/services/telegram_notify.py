"""
Direct Telegram notifier for website chat/leads.

Primary path:
    backend event -> OpenClaw CLI -> Telegram chat (account: Serik)

Fallback path:
    backend event -> Telegram Bot API

The notifier never raises: delivery failures are logged and skipped.
"""

import asyncio
import hashlib
import logging
from contextlib import suppress

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
_LAST_FINGERPRINT: dict[str, str] = {}
_IMPORTANT_KEYWORDS = (
    "цена", "стоит", "₽", "телефон", "заказ",
    "оформить", "комплект", "могу подобрать",
    "могу подсказать", "уточните",
)
_IMPORTANT_LENGTH = 180


def is_important_answer(text: str) -> bool:
    if len(text) > _IMPORTANT_LENGTH:
        return True
    text_lower = text.lower()
    return any(kw in text_lower for kw in _IMPORTANT_KEYWORDS)


def _trunc(text: str | None, limit: int = 200) -> str:
    if not text:
        return "—"
    text = " ".join(text.strip().split())
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def format_new_message(payload: dict) -> str:
    return "\n".join([
        "Новый диалог",
        f"Имя: {_trunc(payload.get('name'), 60)}",
        f"Телефон: {_trunc(payload.get('phone'), 30)}",
        f"Telegram: {_trunc(payload.get('telegram'), 40)}",
        f"Сообщение: {_trunc(payload.get('text_preview'), 220)}",
    ])


def format_new_lead(payload: dict) -> str:
    order_summary = payload.get("order_summary") or payload.get("product")
    return "\n".join([
        "Новый лид",
        f"Имя: {_trunc(payload.get('name'), 60)}",
        f"Телефон: {_trunc(payload.get('phone'), 30)}",
        f"Telegram: {_trunc(payload.get('telegram'), 40)}",
        f"Заказ: {_trunc(order_summary, 140)}",
        f"Статус: {_trunc(payload.get('status') or 'new', 30)}",
    ])


def format_important_answer(payload: dict) -> str:
    return "\n".join([
        "Андрей ответил",
        f"Клиент: {_trunc(payload.get('name') or payload.get('conversation_id'), 60)}",
        f"Ответ: {_trunc(payload.get('answer'), 260)}",
    ])


def _fingerprint(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _is_duplicate(conversation_id: str, event_type: str, text: str) -> bool:
    key = f"{conversation_id}:{event_type}"
    fp = _fingerprint(text)
    if _LAST_FINGERPRINT.get(key) == fp:
        return True
    _LAST_FINGERPRINT[key] = fp
    return False


async def _send_via_openclaw(text: str) -> bool:
    cli_path = settings.openclaw_cli_path
    target = settings.openclaw_notify_target
    channel = settings.openclaw_notify_channel
    account = settings.openclaw_notify_account

    if not cli_path or not target or not channel:
        logger.warning("OpenClaw notifier disabled: missing cli_path/target/channel")
        return False

    cmd = [
        cli_path,
        "message",
        "send",
        "--channel", channel,
        "--target", target,
        "--message", text,
        "--silent",
        "--json",
    ]
    if account:
        cmd.extend(["--account", account])

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            logger.info("telegram notify sent via OpenClaw account=%s target=%s", account or "default", target)
            return True
        logger.error(
            "OpenClaw notify failed rc=%s stdout=%s stderr=%s",
            proc.returncode,
            stdout.decode("utf-8", errors="ignore")[:300],
            stderr.decode("utf-8", errors="ignore")[:300],
        )
        return False
    except FileNotFoundError:
        logger.error("OpenClaw CLI not found at %s", cli_path)
        return False
    except Exception as exc:
        logger.error("OpenClaw notify error: %s", exc, exc_info=True)
        return False


async def _send_via_bot_api(text: str) -> bool:
    token = settings.telegram_notify_bot_token
    chat_id = settings.telegram_notify_chat_id
    if not token or not chat_id:
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
            logger.info("telegram notify sent via Bot API chat_id=%s", chat_id)
            return True
        logger.error("Telegram Bot API error %s: %s", resp.status_code, resp.text[:300])
        return False
    except Exception as exc:
        logger.error("Telegram Bot API notify error: %s", exc, exc_info=True)
        return False


async def send_telegram_message(text: str) -> bool:
    sent = await _send_via_openclaw(text)
    if sent:
        return True
    return await _send_via_bot_api(text)


async def notify_new_message(payload: dict) -> None:
    conversation_id = payload.get("conversation_id", "")
    text = format_new_message(payload)
    if _is_duplicate(conversation_id, "new_message", text):
        return
    with suppress(Exception):
        await send_telegram_message(text)


async def notify_new_lead(payload: dict) -> None:
    conversation_id = payload.get("conversation_id", "")
    text = format_new_lead(payload)
    if _is_duplicate(conversation_id, "new_lead", text):
        return
    with suppress(Exception):
        await send_telegram_message(text)


async def notify_important_answer(payload: dict) -> None:
    conversation_id = payload.get("conversation_id", "")
    answer = payload.get("answer", "")
    if not is_important_answer(answer):
        return
    text = format_important_answer(payload)
    if _is_duplicate(conversation_id, "important_answer", text):
        return
    with suppress(Exception):
        await send_telegram_message(text)
