from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BatteryPack(Base):
    __tablename__ = "battery_packs"

    id: Mapped[int] = mapped_column(primary_key=True)
    pilot_id: Mapped[int] = mapped_column(ForeignKey("pilots.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    capacity_mah: Mapped[int | None] = mapped_column(Integer)
    cell_count: Mapped[int | None] = mapped_column(Integer)

    pilot: Mapped["Pilot"] = relationship("Pilot", back_populates="battery_packs")
    usages: Mapped[list["PackUsage"]] = relationship("PackUsage", back_populates="pack")


class PackUsage(Base):
    __tablename__ = "pack_usages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    pack_id: Mapped[int] = mapped_column(ForeignKey("battery_packs.id"), nullable=False)
    cycles_in_session: Mapped[int] = mapped_column(Integer, default=1)

    session: Mapped["Session"] = relationship("Session", back_populates="pack_usages")
    pack: Mapped["BatteryPack"] = relationship("BatteryPack", back_populates="usages")
