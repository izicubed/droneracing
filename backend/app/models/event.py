import enum
from datetime import date
from sqlalchemy import String, Enum, Integer, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventFormat(str, enum.Enum):
    multigp = "MultiGP"
    arrive_and_fly = "arrive-and-fly"
    custom = "custom"


class HeatStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    done = "done"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    date: Mapped[date | None] = mapped_column(Date)
    format: Mapped[EventFormat] = mapped_column(Enum(EventFormat), default=EventFormat.custom)
    organizer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    rotorhazard_url: Mapped[str | None] = mapped_column(String(500))

    heats: Mapped[list["Heat"]] = relationship("Heat", back_populates="event", cascade="all, delete-orphan")


class Heat(Base):
    __tablename__ = "heats"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    heat_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[HeatStatus] = mapped_column(Enum(HeatStatus), default=HeatStatus.pending)

    event: Mapped["Event"] = relationship("Event", back_populates="heats")
    pilots: Mapped[list["HeatPilot"]] = relationship("HeatPilot", back_populates="heat", cascade="all, delete-orphan")


class HeatPilot(Base):
    __tablename__ = "heat_pilots"

    id: Mapped[int] = mapped_column(primary_key=True)
    heat_id: Mapped[int] = mapped_column(ForeignKey("heats.id"), nullable=False)
    pilot_id: Mapped[int] = mapped_column(ForeignKey("pilots.id"), nullable=False)
    gate_color: Mapped[str | None] = mapped_column(String(50))
    result_position: Mapped[int | None] = mapped_column(Integer)

    heat: Mapped["Heat"] = relationship("Heat", back_populates="pilots")
    pilot: Mapped["Pilot"] = relationship("Pilot", back_populates="heat_slots")
