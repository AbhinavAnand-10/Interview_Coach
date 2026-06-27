from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import Base, engine, get_db

# Import all models so SQLAlchemy registers them before create_all
import models.user          # noqa: F401
import models.refresh_token # noqa: F401
import models.session       # noqa: F401
import models.transcript    # noqa: F401
import models.analytics     # noqa: F401

from routers.auth import router as auth_router
from routers.sessions import router as sessions_router
from ws.interview_ws import SessionManager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables verified")
    yield
    await engine.dispose()
    print("🔌 Database connections closed")


app = FastAPI(
    title="Interview Coach API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "2.0.0"}


@app.websocket("/ws/session/{session_id}")
async def session_websocket(
    websocket: WebSocket,
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Live interview WebSocket endpoint.
    
    Client sends:
      - Binary frames: raw PCM audio (16kHz, 16-bit mono)
      - JSON: { "type": "mediapipe_metrics", "data": {...} }
      - JSON: { "type": "end_session" }
    
    Server sends:
      - JSON: { "type": "session_start" }
      - JSON: { "type": "transcript", "text": "...", "chunk_index": N }
      - JSON: { "type": "feedback", ...scores... }
      - JSON: { "type": "session_complete", ... }
    """
    await websocket.accept()
    manager = SessionManager(session_id, websocket, db)
    await manager.run()
