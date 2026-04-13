from pydantic import BaseModel


class PilotCreate(BaseModel):
    callsign: str
    real_name: str | None = None
    avatar_url: str | None = None


class PilotUpdate(BaseModel):
    callsign: str | None = None
    real_name: str | None = None
    avatar_url: str | None = None


class PilotResponse(BaseModel):
    id: int
    user_id: int
    callsign: str
    real_name: str | None
    avatar_url: str | None

    model_config = {"from_attributes": True}
