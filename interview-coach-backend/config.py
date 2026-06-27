from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost/interview_coach"

    # ── JWT ──────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30   # "Remember Me" — 30-day persistent cookie
    refresh_token_session_days: int = 1   # Session-only — cookie dies on browser close

    # ── Ollama (Phase 2) ─────────────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # ── Whisper (Phase 2) ────────────────────────────────────────────────────
    whisper_model_size: str = "base"
    whisper_device: str = "cpu"

    # ── CORS ─────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
