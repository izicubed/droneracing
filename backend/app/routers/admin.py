from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.pilot import Pilot
from app.models.session import Session, SessionType
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
