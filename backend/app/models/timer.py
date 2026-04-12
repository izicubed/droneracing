from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimerConfig(Base):
    __tablename__ = "timer_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    pre_beep_delay_sec: Mapped[float] = mapped_column(Float, default=1.0)
    beep_count: Mapped[int] = mapped_column(Integer, default=5)
    random_delay_min_sec: Mapped[float] = mapped_column(Float, default=0.5)
    random_delay_max_sec: Mapped[float] = mapped_column(Float, default=3.0)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
