from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

# Allowed statuses
LEAD_STATUSES = ("new", "in_progress", "qualified", "closed")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telegram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    product: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="website_chat")
    status: Mapped[str] = mapped_column(String(50), default="new")  # new, in_progress, qualified, closed
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
