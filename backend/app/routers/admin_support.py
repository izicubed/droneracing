import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
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


def _token_secret() -> bytes:
    return hashlib.sha256(settings.admin_password.encode("utf-8")).digest()


def _issue_admin_token(email: str) -> str:
    payload = {
        "email": email,
        "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp()),
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii")
    sig = hmac.new(_token_secret(), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _validate_admin_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    try:
        payload_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(_token_secret(), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("ascii")))
        if payload.get("email") != ADMIN_EMAIL:
            return False
        if int(payload.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
            return False
        return True
    except Exception:
        return False


def _require_admin(admin_token: Optional[str] = Cookie(default=None)) -> None:
    if not _validate_admin_token(admin_token):
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
    token = _issue_admin_token(body.email)
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * 7,  # 7 days
    )
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
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
