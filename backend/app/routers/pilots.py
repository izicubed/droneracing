from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.pilot import Pilot
from app.models.user import User
from app.schemas.pilot import PilotCreate, PilotUpdate, PilotResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/pilots", tags=["pilots"])


@router.get("/me", response_model=PilotResponse)
async def get_my_pilot(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pilot).where(Pilot.user_id == current_user.id))
    pilot = result.scalar_one_or_none()
    if not pilot:
        raise HTTPException(status_code=404, detail="Pilot profile not found")
    return pilot


@router.post("/me", response_model=PilotResponse, status_code=201)
async def create_my_pilot(
    body: PilotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Pilot).where(Pilot.user_id == current_user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Pilot profile already exists")
    pilot = Pilot(
        user_id=current_user.id,
        callsign=body.callsign.strip(),
        real_name=body.real_name,
        avatar_url=body.avatar_url,
    )
    db.add(pilot)
    await db.commit()
    await db.refresh(pilot)
    return pilot


@router.put("/me", response_model=PilotResponse)
async def update_my_pilot(
    body: PilotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pilot).where(Pilot.user_id == current_user.id))
    pilot = result.scalar_one_or_none()
    if not pilot:
        raise HTTPException(status_code=404, detail="Pilot profile not found")
    if body.callsign is not None:
        pilot.callsign = body.callsign.strip()
    if body.real_name is not None:
        pilot.real_name = body.real_name
    if body.avatar_url is not None:
        pilot.avatar_url = body.avatar_url or None
    await db.commit()
    await db.refresh(pilot)
    return pilot
