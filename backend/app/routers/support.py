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
    if conv is None:
        conv = Conversation(
            id=body.conversation_id,
            user_email=body.user_email,
            status="open",
        )
        db.add(conv)
        await db.flush()
    elif body.user_email and not conv.user_email:
        conv.user_email = body.user_email

    # Save user message
    user_msg = Message(
        conversation_id=body.conversation_id,
        sender="user",
        text=body.text,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    await db.flush()

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

    # Check if lead keywords present — create/update lead
    text_lower = body.text.lower()
    if any(kw in text_lower for kw in LEAD_KEYWORDS):
        result = await db.execute(select(Lead).where(Lead.conversation_id == body.conversation_id))
        lead = result.scalar_one_or_none()
        if lead is None:
            lead = Lead(
                conversation_id=body.conversation_id,
                email=body.user_email,
                status="new",
            )
            db.add(lead)

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
