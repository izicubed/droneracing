from sqlalchemy import String, Integer, Date, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import datetime


class Result(Base):
    __tablename__ = "results"
    id: Mapped[int] = mapped_column(primary_key=True)
    pilot: Mapped[str] = mapped_column(String(100), nullable=False)
    event_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    competition_level: Mapped[str] = mapped_column(String(100), nullable=False)
    drone_class: Mapped[str] = mapped_column(String(100), nullable=False)
    qualification_place: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_place: Mapped[int] = mapped_column(Integer, nullable=False)
    race_name: Mapped[str] = mapped_column(String(300), nullable=False)
    venue: Mapped[str | None] = mapped_column(String(300), nullable=True)
    link: Mapped[str | None] = mapped_column(Text, nullable=True)
