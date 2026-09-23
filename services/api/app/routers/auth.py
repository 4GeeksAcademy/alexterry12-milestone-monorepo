"""Authentication routes for the TrackFlow company API."""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.dependencies import get_current_user
from app.models import Profile, Role, User
from app.security import hash_password, verify_password
from app.services.email import send_password_reset_email
from app.services.password_reset import (
    create_password_reset_token,
    get_password_reset_token_by_hash,
    mark_password_reset_token_used,
)
from app.services.users import (
    get_profile_by_user_id,
    get_user_by_email,
    get_user_by_id,
    set_user_password,
)
from app.tokens import create_access_token

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_FAILED_DETAIL = "Invalid email or password"
_FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)
_INVALID_RESET_TOKEN = "Invalid or expired reset token."
_WRONG_CURRENT_PASSWORD = "Current password is incorrect."


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    email: EmailStr
    role: Role
    profile: Profile | None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class MessageResponse(BaseModel):
    message: str


def _sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    """Authenticate with email and password; return a bearer access token."""
    user = get_user_by_email(str(payload.email))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_LOGIN_FAILED_DETAIL,
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_LOGIN_FAILED_DETAIL,
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=MeResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> MeResponse:
    """Return the authenticated user's email, role, and linked profile."""
    profile = get_profile_by_user_id(current_user.id)
    return MeResponse(
        email=current_user.email,
        role=current_user.role,
        profile=profile,
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """Request a password reset email. Always returns the same generic message."""
    frontend_url = (os.environ.get("FRONTEND_URL") or "").rstrip("/")
    if not frontend_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FRONTEND_URL is not set.",
        )
    if not os.environ.get("RESEND_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY is not set.",
        )

    user = get_user_by_email(str(payload.email))
    if user is not None and user.is_active:
        raw_token = secrets.token_urlsafe(32)
        create_password_reset_token(user.id, _sha256_hex(raw_token))
        reset_url = f"{frontend_url}/reset-password?token={raw_token}"
        send_password_reset_email(str(user.email), reset_url)

    return ForgotPasswordResponse(message=_FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Set a new password using a one-time reset token."""
    token_row = get_password_reset_token_by_hash(_sha256_hex(payload.token))
    if token_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_INVALID_RESET_TOKEN,
        )

    now = datetime.now(timezone.utc)
    if _as_utc(token_row.expires_at) < now or token_row.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_INVALID_RESET_TOKEN,
        )

    user = get_user_by_id(token_row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_INVALID_RESET_TOKEN,
        )

    set_user_password(user.id, payload.new_password)
    mark_password_reset_token_used(token_row.id)
    return MessageResponse(message="Password has been reset.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Change password for the authenticated user."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_WRONG_CURRENT_PASSWORD,
        )

    set_user_password(current_user.id, payload.new_password)
    return MessageResponse(message="Password has been changed.")
