from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.pilot import Pilot
from app.models.session import Session, SessionType, Lap, LapSource
from app.models.user import User
from app.schemas.session import TrainingCreate, TrainingResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


async def _get_pilot(user: User, db: AsyncSession) -> Pilot:
    result = await db.execute(select(Pilot).where(Pilot.user_id == user.id))
    pilot = result.scalar_one_or_none()
    if not pilot:
        raise HTTPException(
            status_code=404,
            detail="Create a pilot profile first",
        )
    return pilot


@router.post("/", response_model=TrainingResponse, status_code=201)
async def create_session(
    body: TrainingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pilot = await _get_pilot(current_user, db)
    now = (body.started_at.replace(tzinfo=None) if body.started_at else datetime.utcnow())
    session = Session(
        pilot_id=pilot.id,
        type=SessionType.training,
        started_at=now,
        ended_at=datetime.utcnow(),
        pack_count=body.pack_count,
    )
    db.add(session)
    await db.flush()
    for i, duration_ms in enumerate(body.laps, start=1):
        db.add(Lap(
            session_id=session.id,
            lap_number=i,
            duration_ms=duration_ms,
            source=LapSource.manual,
        ))
    await db.commit()
    result = await db.execute(
        select(Session)
        .where(Session.id == session.id)
        .options(selectinload(Session.laps))
    )
    return result.scalar_one()


@router.get("/", response_model=list[TrainingResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pilot = await _get_pilot(current_user, db)
    result = await db.execute(
        select(Session)
        .where(Session.pilot_id == pilot.id, Session.type == SessionType.training)
        .options(selectinload(Session.laps))
        .order_by(Session.started_at.desc())
    )
    return result.scalars().all()
