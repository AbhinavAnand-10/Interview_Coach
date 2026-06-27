from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone
import uuid

from database import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Audio metrics
    avg_wpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    filler_word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    filler_words: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    pause_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Visual metrics
    avg_eye_contact_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_blink_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    head_stability_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # AI scores
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    clarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    structure_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # AI feedback
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_strengths: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    ai_improvements: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
