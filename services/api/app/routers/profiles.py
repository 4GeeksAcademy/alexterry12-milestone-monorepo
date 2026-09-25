"""Profile routes for the TrackFlow company API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.schemas import Profile, ProfileCreate, User
from app.services.users import get_profile_by_user_id, update_profile

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=Profile)
def read_my_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> Profile:
    """Return the authenticated user's profile."""
    profile = get_profile_by_user_id(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return profile


@router.put("/me", response_model=Profile)
def update_my_profile(
    payload: ProfileCreate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> Profile:
    """Update name, phone, and address for the authenticated user."""
    profile = update_profile(current_user.id, payload)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return profile
