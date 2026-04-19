import asyncio
import time
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.conversation import Conversation
from app.models.lead import Lead
from app.models.message import Message
from app.services.support_service import process_support_message
from app.services.lead_parser import parse_lead_fields, merge_lead_fields
from app.services.lead_events import emit_lead_event
from app.services.telegram_notify import notify_important_answer

router = APIRouter(prefix="/api/support", tags=["support"])

# In-memory rate limiter: {conversation_id: [timestamp, ...]}
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 5
RATE_WINDOW = 60  # seconds

LEAD_KEYWORDS = ("купить", "заказать", "телефон", "адрес", "цена", "сколько стоит", "приобрести", "заказ")


def _check_rate_limit(conversation_id: str) -> None:
    now = time.monotonic()
    window_start = now - RATE_WINDOW
    calls = [t for t in _rate_store[conversation_id] if t > window_start]
    if len(calls) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Слишком много сообщений. Подождите немного.")
    calls.append(now)
    _rate_store[conversation_id] = calls


class SendMessageRequest(BaseModel):
    conversation_id: str
    user_email: str | None = None
    text: str


class MessageOut(BaseModel):
    id: int
    sender: str
    text: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/message")
async def send_message(body: SendMessageRequest, db: AsyncSession = Depends(get_db)):
    if len(body.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Сообщение слишком короткое.")

    _check_rate_limit(body.conversation_id)

    # Get or create conversation
    conv = await db.get(Conversation, body.conversation_id)
    is_new_conversation = conv is None
    if conv is None:
        conv = Conversation(
            id=body.conversation_id,
            user_email=body.user_email,
            status="open",
        )
        db.add(conv)
        await db.flush()
        await emit_lead_event("new_conversation", {"conversation_id": body.conversation_id})
    elif body.user_email and not conv.user_email:
        conv.user_email = body.user_email

    # Parse lead fields early so we can enrich event payloads
    parsed = parse_lead_fields(body.text)

    # Save user message
    user_msg = Message(
        conversation_id=body.conversation_id,
        sender="user",
        text=body.text,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    await db.flush()
    await emit_lead_event("new_message", {
        "conversation_id": body.conversation_id,
        "text_preview": body.text[:120],
        "name": parsed.name,
        "phone": parsed.phone,
        "telegram": parsed.telegram,
    })

    # Get LLM response
    try:
        andrey_text = await process_support_message(body.text)
    except Exception:
        andrey_text = "Извините, временные технические неполадки. Попробуйте позже или напишите напрямую @cubedny 🙏"

    # Save Andrey's response
    andrey_msg = Message(
        conversation_id=body.conversation_id,
        sender="andrey",
        text=andrey_text,
        created_at=datetime.utcnow(),
    )
    db.add(andrey_msg)

    # Notify if Andrey's auto-reply looks important
    asyncio.create_task(notify_important_answer({
        "conversation_id": body.conversation_id,
        "name": parsed.name,
        "answer": andrey_text,
        "risk": "автоответ с важной инфой",
    }))

    # Determine if we should create/update a lead
    text_lower = body.text.lower()
    has_lead_keywords = any(kw in text_lower for kw in LEAD_KEYWORDS)
    has_contact_info = bool(parsed.phone or parsed.email or parsed.name)

    result = await db.execute(select(Lead).where(Lead.conversation_id == body.conversation_id))
    lead = result.scalar_one_or_none()

    if lead is None:
        if has_lead_keywords or has_contact_info:
            lead = Lead(
                conversation_id=body.conversation_id,
                email=parsed.email or body.user_email,
                phone=parsed.phone,
                name=parsed.name,
                telegram=parsed.telegram,
                product=parsed.product,
                order_summary=parsed.order_summary,
                notes=parsed.notes,
                source="website_chat",
                status="new",
            )
            db.add(lead)
            await db.flush()
            await emit_lead_event("new_lead", {
                "conversation_id": body.conversation_id,
                "name": parsed.name,
                "phone": parsed.phone,
                "telegram": parsed.telegram,
                "product": parsed.product,
                "order_summary": parsed.order_summary,
                "status": "new",
            })
    else:
        # Merge any new fields extracted from this message
        changed = merge_lead_fields(lead, parsed)
        # Also pick up user_email from conversation if lead email still empty
        if body.user_email and not lead.email:
            lead.email = body.user_email
            changed = True
        if changed:
            lead.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(andrey_msg)

    return {
        "id": andrey_msg.id,
        "sender": andrey_msg.sender,
        "text": andrey_msg.text,
        "created_at": andrey_msg.created_at.isoformat(),
        "andrey_response": andrey_text,
    }


@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conversation_id)
    if conv is None:
        return {"id": conversation_id, "messages": [], "status": "open"}

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    return {
        "id": conv.id,
        "status": conv.status,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "text": m.text,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }
