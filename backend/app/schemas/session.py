from datetime import datetime
from pydantic import BaseModel


class TrainingCreate(BaseModel):
    pack_count: int = 0
    laps: list[int] = []  # duration_ms per flight
    started_at: datetime | None = None


class LapOut(BaseModel):
    lap_number: int
    duration_ms: int

    model_config = {"from_attributes": True}


class TrainingResponse(BaseModel):
    id: int
    pack_count: int = 0
    started_at: datetime
    ended_at: datetime | None = None
    laps: list[LapOut] = []

    model_config = {"from_attributes": True}
