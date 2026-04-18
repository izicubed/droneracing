from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.pilot import Pilot
from app.models.session import Session, SessionType
from app.models.lead import Lead
from app.models.message import Message
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin only")
    return current_user


@router.get("/users")
async def list_users(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).options(selectinload(User.pilot)).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at,
            "callsign": u.pilot.callsign if u.pilot else None,
        }
        for u in users
    ]


class LeadUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


@router.get("/leads")
async def list_leads(
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = result.scalars().all()
    return [
        {
            "id": l.id,
            "conversation_id": l.conversation_id,
            "name": l.name,
            "phone": l.phone,
            "email": l.email,
            "product": l.product,
            "status": l.status,
            "notes": l.notes,
            "created_at": l.created_at,
            "updated_at": l.updated_at,
        }
        for l in leads
    ]


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: int,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == lead.conversation_id)
        .order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()
    return {
        "id": lead.id,
        "conversation_id": lead.conversation_id,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "product": lead.product,
        "status": lead.status,
        "notes": lead.notes,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
        "messages": [
            {"id": m.id, "sender": m.sender, "text": m.text, "created_at": m.created_at}
            for m in messages
        ],
    }


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: int,
    body: LeadUpdate,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if body.status is not None:
        lead.status = body.status
    if body.notes is not None:
        lead.notes = body.notes
    await db.commit()
    await db.refresh(lead)
    return {"id": lead.id, "status": lead.status, "notes": lead.notes}


@router.get("/users/{user_id}/sessions")
async def get_user_sessions(
    user_id: int,
    _: User = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    pilot_result = await db.execute(select(Pilot).where(Pilot.user_id == user_id))
    pilot = pilot_result.scalar_one_or_none()
    if not pilot:
        return []
    result = await db.execute(
        select(Session)
        .where(Session.pilot_id == pilot.id, Session.type == SessionType.training)
        .options(selectinload(Session.laps))
        .order_by(Session.started_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "pack_count": s.pack_count,
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "laps": [{"lap_number": l.lap_number, "duration_ms": l.duration_ms} for l in s.laps],
        }
        for s in sessions
    ]
