from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone

from database import get_db
from models.session import Session
from models.analytics import Analytics
from models.transcript import Transcript
from routers.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/sessions", tags=["Sessions"])


class CreateSessionRequest(BaseModel):
    title: str = "Untitled Session"
    session_type: str = "interview"


class SessionOut(BaseModel):
    id: str
    title: str
    session_type: str
    status: str
    duration_seconds: Optional[int] = None
    started_at: datetime
    ended_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AnalyticsSummary(BaseModel):
    overall_score: Optional[float] = None
    clarity_score: Optional[float] = None
    confidence_score: Optional[float] = None
    structure_score: Optional[float] = None
    avg_wpm: Optional[float] = None
    filler_word_count: Optional[int] = None
    avg_eye_contact_score: Optional[float] = None
    avg_blink_rate: Optional[float] = None
    head_stability_score: Optional[float] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[list] = None
    ai_improvements: Optional[list] = None

    model_config = {"from_attributes": True}


class SessionWithAnalytics(BaseModel):
    id: str
    title: str
    session_type: str
    status: str
    duration_seconds: Optional[int] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    analytics: Optional[AnalyticsSummary] = None

    model_config = {"from_attributes": True}


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    body: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = Session(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        title=body.title,
        session_type=body.session_type,
        status="active",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("", response_model=list[SessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == str(current_user.id))
        .order_by(Session.started_at.desc())
    )
    return result.scalars().all()


@router.get("/with-analytics")
async def list_sessions_with_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all sessions with their analytics embedded. Used by dashboard and analytics page."""
    sessions_result = await db.execute(
        select(Session)
        .where(Session.user_id == str(current_user.id))
        .order_by(Session.started_at.asc())
        .limit(50)
    )
    sessions = sessions_result.scalars().all()

    output = []
    for s in sessions:
        a_result = await db.execute(
            select(Analytics).where(Analytics.session_id == s.id)
        )
        analytics = a_result.scalar_one_or_none()

        output.append({
            "id": s.id,
            "title": s.title,
            "session_type": s.session_type,
            "status": s.status,
            "duration_seconds": s.duration_seconds,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "analytics": {
                "overall_score": analytics.overall_score,
                "clarity_score": analytics.clarity_score,
                "confidence_score": analytics.confidence_score,
                "structure_score": analytics.structure_score,
                "avg_wpm": analytics.avg_wpm,
                "filler_word_count": analytics.filler_word_count,
                "avg_eye_contact_score": analytics.avg_eye_contact_score,
                "avg_blink_rate": analytics.avg_blink_rate,
                "head_stability_score": analytics.head_stability_score,
                "ai_summary": analytics.ai_summary,
                "ai_strengths": analytics.ai_strengths,
                "ai_improvements": analytics.ai_improvements,
            } if analytics else None,
        })

    return output


@router.get("/{session_id}/analytics")
async def get_analytics(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analytics).where(Analytics.session_id == session_id)
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found")
    return analytics


@router.get("/{session_id}/transcript")
async def get_transcript(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transcript)
        .where(Transcript.session_id == session_id)
        .order_by(Transcript.chunk_index)
    )
    chunks = result.scalars().all()
    full_text = " ".join(c.text for c in chunks)
    return {"session_id": session_id, "chunks": chunks, "full_text": full_text}
