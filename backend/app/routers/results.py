from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.result import Result

router = APIRouter(prefix="/results", tags=["results"])


class ResultCreate(BaseModel):
    pilot: str
    event_date: date
    competition_level: str
    drone_class: str
    qualification_place: Optional[int] = None
    final_place: int
    race_name: str
    venue: Optional[str] = None
    link: Optional[str] = None


class ResultUpdate(BaseModel):
    pilot: Optional[str] = None
    event_date: Optional[date] = None
    competition_level: Optional[str] = None
    drone_class: Optional[str] = None
    qualification_place: Optional[int] = None
    final_place: Optional[int] = None
    race_name: Optional[str] = None
    venue: Optional[str] = None
    link: Optional[str] = None


class ResultRead(ResultCreate):
    id: int

    class Config:
        from_attributes = True


@router.get("", response_model=list[ResultRead])
async def list_results(db: AsyncSession = Depends(get_db)):
    stmt = select(Result).order_by(Result.final_place.asc(), Result.event_date.desc())
    rows = await db.execute(stmt)
    return rows.scalars().all()


@router.post("", response_model=ResultRead, status_code=201)
async def create_result(body: ResultCreate, db: AsyncSession = Depends(get_db)):
    result = Result(**body.model_dump())
    db.add(result)
    await db.commit()
    await db.refresh(result)
    return result


@router.patch("/{result_id}", response_model=ResultRead)
async def update_result(result_id: int, body: ResultUpdate, db: AsyncSession = Depends(get_db)):
    row = await db.get(Result, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{result_id}", status_code=204)
async def delete_result(result_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(Result, result_id)
    if not row:
        raise HTTPException(status_code=404, detail="Result not found")
    await db.delete(row)
    await db.commit()
