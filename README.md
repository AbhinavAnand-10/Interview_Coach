# 🎤 InterviewAI — AI Multimodal Interview & Presentation Coach

A production-grade, full-stack AI coaching platform that gives real-time feedback on your speech, body language, and presentation skills — using **100% free, self-hosted AI models**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

- 🎥 **Live camera feed** with real-time face tracking overlay
- 👁️ **Eye contact scoring** via Google MediaPipe iris tracking (client-side WASM — zero backend cost)
- 🎤 **Live speech transcription** via faster-whisper (local, fully offline)
- 🤖 **AI feedback** on filler words, pacing, clarity, and structure via Llama 3 (Ollama)
- 📊 **Session analytics** with animated score rings, trend charts, and improvement suggestions
- 🔐 **Custom JWT auth** with dual-token system, bcrypt, and 30-day Remember Me cookie
- 🌙 **Dark / Light / System** theme with instant switching via next-themes
- 💾 **PostgreSQL persistence** for sessions, transcripts, and per-session analytics

---

## 🏗️ Architecture

```
Browser (Next.js)
├── MediaPipe WASM      → Eye contact, blink rate, head stability (client-side, zero cost)
├── MediaRecorder API   → audio/webm chunks every 3s
│     └── WebSocket ──► FastAPI
│                          ├── ffmpeg       → webm → PCM conversion
│                          ├── faster-whisper → transcript chunk (saved to DB)
│                          ├── Ollama Llama 3 → NLP scores + feedback (pushed back to client)
│                          └── PostgreSQL   → sessions, transcripts, analytics
└── REST API            → Auth, sessions, analytics endpoints
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | FastAPI (Python 3.12), WebSockets, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 with asyncpg |
| AI — Transcription | faster-whisper (Whisper base model, local CPU) |
| AI — NLP Feedback | Ollama + Llama 3 8B (local, fully offline) |
| AI — Vision | Google MediaPipe Face Mesh + Iris (browser WASM, no server) |
| Auth | Custom JWT (15-min access + 30-day refresh tokens), bcrypt cost-12, HttpOnly SameSite cookies |
| Audio Pipeline | MediaRecorder API → WebSocket binary → ffmpeg → PCM → Whisper |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16
- [Ollama](https://ollama.com) installed with `llama3` model pulled
- ffmpeg (`sudo apt install ffmpeg`)

### Backend Setup

```bash
cd interview-coach-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Fill in JWT_SECRET_KEY and DATABASE_URL
ollama serve &                # Start Ollama in background
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd interview-coach-frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `http://localhost:3000`

---

## 📁 Project Structure

```
interview-coach/
├── interview-coach-backend/
│   ├── main.py                  # FastAPI app + WebSocket endpoint
│   ├── routers/
│   │   ├── auth.py              # JWT auth (register, login, refresh, logout)
│   │   └── sessions.py          # Session CRUD + analytics endpoints
│   ├── models/                  # SQLAlchemy models (User, Session, Transcript, Analytics)
│   ├── services/
│   │   ├── whisper_service.py   # faster-whisper transcription
│   │   └── ollama_service.py    # Llama 3 NLP analysis
│   └── ws/
│       └── interview_ws.py      # WebSocket session manager
│
└── interview-coach-frontend/
    ├── src/app/
    │   ├── dashboard/           # Real-time stats + score trend charts
    │   ├── analytics/           # Session history + radar charts
    │   ├── session/[id]/        # Live interview room
    │   └── settings/            # Profile + theme preferences
    ├── src/components/
    │   └── session/             # CameraPane, MetricsOverlay, TranscriptPane, FeedbackPanel
    └── src/hooks/
        ├── useMediaPipe.ts      # Client-side face mesh + iris tracking
        ├── useAudioRecorder.ts  # MediaRecorder API wrapper
        └── useSessionWebSocket.ts # WebSocket client with binary audio streaming
```

---

## 🔐 Security Highlights

- Passwords hashed with **bcrypt** (cost factor 12)
- Access tokens expire in **15 minutes**
- Refresh tokens stored as **SHA-256 hashes** in DB — raw token never persisted
- Refresh token **rotation** on every use — compromised tokens are auto-revoked
- HttpOnly, SameSite=Strict cookie scoped to `/auth` path only
- CORS locked to frontend origin with `allow_credentials=True`

---

## 📄 License

MIT
