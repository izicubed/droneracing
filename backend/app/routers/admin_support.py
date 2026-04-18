import hashlib
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.conversation import Conversation
from app.models.lead import Lead
from app.models.message import Message

router = APIRouter(prefix="/api/admin", tags=["admin-support"])

# Simple in-memory token store (good enough for single-instance MVP)
_valid_tokens: set[str] = set()


def _require_admin(admin_token: Optional[str] = Cookie(default=None)) -> None:
    if not admin_token or admin_token not in _valid_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Auth ──────────────────────────────────────────────────────────────────────

ADMIN_EMAIL = "izicubed@gmail.com"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    if body.email != ADMIN_EMAIL or body.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = secrets.token_hex(32)
    _valid_tokens.add(token)
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * 7,  # 7 days
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response, admin_token: Optional[str] = Cookie(default=None)):
    if admin_token and admin_token in _valid_tokens:
        _valid_tokens.discard(admin_token)
    response.delete_cookie("admin_token")
    return {"ok": True}


@router.get("/session")
async def check_session(_: None = Depends(_require_admin)):
    """Validate admin session — returns 200 if cookie is valid, 401 otherwise."""
    return {"ok": True}


# ── Leads ─────────────────────────────────────────────────────────────────────

@router.get("/leads")
async def list_leads(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_admin),
):
    stmt = select(Lead).order_by(Lead.created_at.desc())
    if status:
        stmt = stmt.where(Lead.status == status)
    result = await db.execute(stmt)
    leads = result.scalars().all()
    return {
        "leads": [
            {
                "id": lead.id,
                "conversation_id": lead.conversation_id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "product": lead.product,
                "status": lead.status,
                "notes": lead.notes,
                "created_at": lead.created_at.isoformat(),
            }
            for lead in leads
        ]
    }


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_admin),
):
    lead = await db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == lead.conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    return {
        "lead": {
            "id": lead.id,
            "conversation_id": lead.conversation_id,
            "name": lead.name,
            "email": lead.email,
            "phone": lead.phone,
            "product": lead.product,
            "status": lead.status,
            "notes": lead.notes,
            "created_at": lead.created_at.isoformat(),
            "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
        },
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


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    product: Optional[str] = None


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: int,
    body: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_admin),
):
    lead = await db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    lead.updated_at = datetime.utcnow()

    await db.commit()
    return {"ok": True}


# ── Conversations (admin overview) ────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_admin),
):
    result = await db.execute(
        select(Conversation).order_by(Conversation.updated_at.desc())
    )
    convs = result.scalars().all()
    return {
        "conversations": [
            {
                "id": c.id,
                "status": c.status,
                "user_email": c.user_email,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in convs
        ]
    }
