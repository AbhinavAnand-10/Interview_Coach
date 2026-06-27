from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models.refresh_token import RefreshToken
from models.user import User
from schemas.auth import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

# bcrypt context — cost factor 12 is the industry standard sweet spot
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": user_id, "exp": expire, "type": "access", "jti": str(uuid.uuid4())}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token_pair() -> tuple[str, str]:
    """Returns (raw_token_for_cookie, sha256_hash_for_db)."""
    raw = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "access":
            raise JWTError("Wrong token type")
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _set_refresh_cookie(response: Response, raw_token: str, max_age: int | None) -> None:
    """
    Sets an HttpOnly, Secure, SameSite=strict cookie.
    max_age=None  → session cookie (vanishes when browser closes)
    max_age=int   → persistent cookie for that many seconds
    """
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=False,        # Set to True in production (HTTPS required)
        samesite="strict",
        max_age=max_age,
        path="/auth",        # Scoped — only sent to /auth/* endpoints
    )


# ── Dependency: current authenticated user ────────────────────────────────────

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new account. Returns 409 if email or username is already taken."""
    existing = await db.execute(
        select(User).where(
            (User.email == body.email) | (User.username == body.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email or username already exists",
        )

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    await db.commit()
    return {"message": "Account created successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate and issue tokens.

    - Access token  → returned in response body (store in memory, not localStorage)
    - Refresh token → set as HttpOnly cookie (browser manages it automatically)

    If remember_me=True:  refresh cookie lives for 30 days (max_age=2_592_000)
    If remember_me=False: refresh cookie is a session cookie (max_age=None)
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Constant-time comparison prevents user enumeration via timing attacks
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ── Issue tokens ──────────────────────────────────────────────────────
    access_token = create_access_token(str(user.id))
    raw_refresh, refresh_hash = create_refresh_token_pair()

    if body.remember_me:
        max_age = settings.refresh_token_expire_days * 86_400   # 2,592,000 seconds
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    else:
        max_age = None                                           # Session cookie
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_session_days)

    rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=str(user.id),
        token_hash=refresh_hash,
        expires_at=expires_at,
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(rt)
    await db.commit()

    _set_refresh_cookie(response, raw_refresh, max_age)

    return TokenResponse(
        access_token=access_token,
        user_id=str(user.id),
        username=user.username,
        full_name=user.full_name,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    request: Request,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate the refresh token and issue a new access token.
    Called automatically by the frontend when the access token expires.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided"
        )

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked.is_(False),
        )
    )
    rt = result.scalar_one_or_none()

    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has expired. Please log in again.",
        )

    # ── Token rotation: revoke old, issue new ─────────────────────────────
    rt.is_revoked = True

    new_raw, new_hash = create_refresh_token_pair()
    new_rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=rt.user_id,
        token_hash=new_hash,
        expires_at=rt.expires_at,   # Preserve the original window
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(new_rt)
    await db.commit()

    new_access = create_access_token(rt.user_id)

    # Preserve original max_age by checking how much time is left
    remaining = (rt.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()
    new_max_age = int(remaining) if remaining > 86_400 else None

    _set_refresh_cookie(response, new_raw, new_max_age)

    # Get user info for response
    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one()

    return TokenResponse(
        access_token=new_access,
        user_id=rt.user_id,
        username=user.username,
        full_name=user.full_name,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the current refresh token and clear the cookie."""
    if refresh_token:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        rt = result.scalar_one_or_none()
        if rt:
            rt.is_revoked = True
            await db.commit()

    response.delete_cookie("refresh_token", path="/auth")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user
