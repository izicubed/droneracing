import enum
from datetime import datetime
from sqlalchemy import String, Enum, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionType(str, enum.Enum):
    training = "training"
    race = "race"
    heat = "heat"


class CrashSeverity(str, enum.Enum):
    minor = "minor"
    major = "major"


class LapSource(str, enum.Enum):
    manual = "manual"
    rotorhazard = "rotorhazard"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    pilot_id: Mapped[int] = mapped_column(ForeignKey("pilots.id"), nullable=False)
    type: Mapped[SessionType] = mapped_column(Enum(SessionType), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)

    pilot: Mapped["Pilot"] = relationship("Pilot", back_populates="sessions")
    laps: Mapped[list["Lap"]] = relationship("Lap", back_populates="session", cascade="all, delete-orphan")
    crashes: Mapped[list["Crash"]] = relationship("Crash", back_populates="session", cascade="all, delete-orphan")
    pack_usages: Mapped[list["PackUsage"]] = relationship("PackUsage", back_populates="session", cascade="all, delete-orphan")


class Lap(Base):
    __tablename__ = "laps"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    lap_number: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[LapSource] = mapped_column(Enum(LapSource), default=LapSource.manual)

    session: Mapped["Session"] = relationship("Session", back_populates="laps")


class Crash(Base):
    __tablename__ = "crashes"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    severity: Mapped[CrashSeverity] = mapped_column(Enum(CrashSeverity), default=CrashSeverity.minor)
    notes: Mapped[str | None] = mapped_column(Text)

    session: Mapped["Session"] = relationship("Session", back_populates="crashes")
