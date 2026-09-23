"""Authentication routes for the TrackFlow company API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.dependencies import get_current_user
from app.models import Profile, Role, User
from app.security import verify_password
from app.services.users import get_profile_by_user_id, get_user_by_email
from app.tokens import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

_LOGIN_FAILED_DETAIL = "Invalid email or password"


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
