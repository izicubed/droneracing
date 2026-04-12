from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pilot(Base):
    __tablename__ = "pilots"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    callsign: Mapped[str] = mapped_column(String(100), nullable=False)
    real_name: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))

    user: Mapped["User"] = relationship("User", back_populates="pilot")
    equipment: Mapped[list["Equipment"]] = relationship("Equipment", back_populates="pilot")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="pilot")
    battery_packs: Mapped[list["BatteryPack"]] = relationship("BatteryPack", back_populates="pilot")
    heat_slots: Mapped[list["HeatPilot"]] = relationship("HeatPilot", back_populates="pilot")
