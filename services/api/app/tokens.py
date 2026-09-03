"""JWT access token creation and decoding for the TrackFlow company API."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from jose import JWTError, jwt

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

ALGORITHM = "HS256"


def _jwt_settings() -> tuple[str, int]:
    """Read JWT secret and expiry from the environment."""
    secret = os.environ.get("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not set.")

    raw_minutes = os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES")
    if raw_minutes is None:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES is not set.")

    try:
        expire_minutes = int(raw_minutes)
    except ValueError as exc:
        raise RuntimeError(
            "ACCESS_TOKEN_EXPIRE_MINUTES must be an integer."
        ) from exc

    if expire_minutes <= 0:
        raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be greater than zero.")

    return secret, expire_minutes


def create_access_token(user_id: str) -> str:
    """Build a signed JWT for the given user id."""
    secret, expire_minutes = _jwt_settings()
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {"sub": user_id, "exp": expire_at}
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Return the user id from a valid token, or None if invalid or expired."""
    secret, _ = _jwt_settings()
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except JWTError:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None
    return str(user_id)
