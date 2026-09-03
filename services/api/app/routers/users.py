"""User management routes for the TrackFlow company API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.dependencies import get_current_user
from app.models import Role, User, UserCreate, UserPublic
from app.services.users import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])

_FORBIDDEN_DETAIL = "Not enough permissions"


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    role: Role | None = None


def _to_public(user: User) -> UserPublic:
    """Map a stored user to the public API shape."""
    return UserPublic(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
    )


def _require_self_or_admin(current_user: User, target_user_id: str) -> None:
    if current_user.id != target_user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_FORBIDDEN_DETAIL,
        )


@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate) -> UserPublic:
    """Register a new user and linked profile."""
    try:
        user = create_user(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return _to_public(user)


@router.get("/", response_model=list[UserPublic])
def list_all_users(
    _: Annotated[User, Depends(get_current_user)],
) -> list[UserPublic]:
    """Return all users (authenticated)."""
    return [_to_public(user) for user in list_users()]


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: str,
    _: Annotated[User, Depends(get_current_user)],
) -> UserPublic:
    """Return one user by id."""
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return _to_public(user)


@router.put("/{user_id}", response_model=UserPublic)
def update_user_record(
    user_id: str,
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserPublic:
    """Update a user's email; role changes require admin."""
    _require_self_or_admin(current_user, user_id)

    if payload.role is not None and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_FORBIDDEN_DETAIL,
        )

    updated = update_user(
        user_id,
        email=str(payload.email) if payload.email is not None else None,
        role=payload.role,
    )
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
    return _to_public(updated)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(
    user_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a user and linked profile."""
    _require_self_or_admin(current_user, user_id)

    if not delete_user(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found.",
        )
