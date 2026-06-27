from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.session import Session
from models.transcript import Transcript
from models.analytics import Analytics
from services.whisper_service import whisper_service
from services.ollama_service import ollama_service


class SessionManager:
    """
    Manages a single live interview WebSocket session.

    Message protocol (JSON from client → server):
      { "type": "end_session" }
      { "type": "mediapipe_metrics", "data": { eyeContactScore, blinkRate, headStability } }

    Message protocol (JSON from server → client):
      { "type": "session_start", "session_id": "..." }
      { "type": "transcript", "chunk_index": 0, "text": "...", "start_time": 1.2 }
      { "type": "feedback", ...scores... }
      { "type": "session_complete", "feedback": {...}, "full_transcript": "..." }
      { "type": "error", "message": "..." }
    """

    # Send audio for transcription every N bytes (~3 seconds at 16kHz 16-bit mono)
    CHUNK_THRESHOLD = 16000 * 2 * 3

    def __init__(self, session_id: str, websocket: WebSocket, db: AsyncSession):
        self.session_id = session_id
        self.ws = websocket
        self.db = db
        self.chunk_index = 0
        self.transcript_buffer: list[str] = []
        self.start_time = time.time()
        self.audio_buffer = bytearray()

        # Rolling MediaPipe metrics (averaged at session end)
        self.eye_contact_samples: list[float] = []
        self.blink_rate_samples: list[float] = []
        self.head_stability_samples: list[float] = []

    async def run(self):
        await self.ws.send_json({
            "type": "session_start",
            "session_id": self.session_id,
        })

        try:
            while True:
                raw = await self.ws.receive()

                if raw.get("type") == "websocket.disconnect":
                    break

                # Binary audio data
                if "bytes" in raw and raw["bytes"]:
                    self.audio_buffer.extend(raw["bytes"])
                    if len(self.audio_buffer) >= self.CHUNK_THRESHOLD:
                        chunk = bytes(self.audio_buffer)
                        self.audio_buffer = bytearray()
                        asyncio.create_task(self._process_audio_chunk(chunk))

                # JSON control messages
                elif "text" in raw and raw["text"]:
                    try:
                        msg = json.loads(raw["text"])
                        await self._handle_control(msg)
                    except json.JSONDecodeError:
                        pass

        except WebSocketDisconnect:
            pass
        finally:
            # Flush remaining audio
            if self.audio_buffer:
                await self._process_audio_chunk(bytes(self.audio_buffer))
            await self._finalize_session()

    async def _process_audio_chunk(self, audio_bytes: bytes):
        elapsed = time.time() - self.start_time
        idx = self.chunk_index
        self.chunk_index += 1

        # Run whisper in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, whisper_service.transcribe, audio_bytes
        )

        text = result.get("text", "").strip()
        if not text:
            return

        self.transcript_buffer.append(text)

        # Save transcript chunk to DB
        transcript = Transcript(
            id=str(uuid.uuid4()),
            session_id=self.session_id,
            chunk_index=idx,
            text=text,
            start_time=round(elapsed, 2),
            end_time=round(time.time() - self.start_time, 2),
            confidence=result.get("confidence", 0.8),
        )
        self.db.add(transcript)
        await self.db.commit()

        # Push transcript to client immediately
        try:
            await self.ws.send_json({
                "type": "transcript",
                "chunk_index": idx,
                "text": text,
                "start_time": round(elapsed, 2),
            })
        except Exception:
            return

        # Run NLP analysis every 5 chunks (~15 seconds of speech)
        if idx > 0 and idx % 5 == 0:
            asyncio.create_task(self._analyze_and_push())

    async def _analyze_and_push(self):
        full_text = " ".join(self.transcript_buffer)
        feedback = await ollama_service.analyze_speech(full_text)
        try:
            await self.ws.send_json({"type": "feedback", **feedback})
        except Exception:
            pass

    async def _handle_control(self, msg: dict):
        msg_type = msg.get("type")

        if msg_type == "mediapipe_metrics":
            data = msg.get("data", {})
            if "eyeContactScore" in data:
                self.eye_contact_samples.append(float(data["eyeContactScore"]))
            if "blinkRate" in data:
                self.blink_rate_samples.append(float(data["blinkRate"]))
            if "headStability" in data:
                self.head_stability_samples.append(float(data["headStability"]))

        elif msg_type == "end_session":
            raise WebSocketDisconnect()

    async def _finalize_session(self):
        full_transcript = " ".join(self.transcript_buffer)
        duration = int(time.time() - self.start_time)

        # Get final AI feedback
        final_feedback = {}
        if full_transcript.strip():
            final_feedback = await ollama_service.analyze_speech(full_transcript)

        # Update session record
        result = await self.db.execute(
            select(Session).where(Session.id == self.session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.status = "completed"
            session.ended_at = datetime.now(timezone.utc)
            session.duration_seconds = duration

        # Save analytics
        def avg(lst): return round(sum(lst) / len(lst), 1) if lst else None

        analytics = Analytics(
            id=str(uuid.uuid4()),
            session_id=self.session_id,
            user_id=session.user_id if session else "",
            avg_wpm=final_feedback.get("estimated_wpm"),
            filler_word_count=final_feedback.get("filler_word_count"),
            filler_words=final_feedback.get("filler_words"),
            avg_eye_contact_score=avg(self.eye_contact_samples),
            avg_blink_rate=avg(self.blink_rate_samples),
            head_stability_score=avg(self.head_stability_samples),
            overall_score=final_feedback.get("overall_score"),
            clarity_score=final_feedback.get("clarity_score"),
            confidence_score=final_feedback.get("confidence_score"),
            structure_score=final_feedback.get("structure_score"),
            ai_summary=final_feedback.get("summary"),
            ai_strengths=final_feedback.get("strengths"),
            ai_improvements=final_feedback.get("improvements"),
        )
        self.db.add(analytics)
        await self.db.commit()

        # Push final results to client
        try:
            await self.ws.send_json({
                "type": "session_complete",
                "feedback": final_feedback,
                "full_transcript": full_transcript,
                "duration_seconds": duration,
            })
        except Exception:
            pass
