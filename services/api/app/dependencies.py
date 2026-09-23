"""FastAPI dependencies for the TrackFlow company API."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.models import User
from app.services.users import get_user_by_id
from app.tokens import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_INVALID_CREDENTIALS = "Could not validate credentials"
_AUTH_HEADER = {"WWW-Authenticate": "Bearer"}


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """Decode a bearer token and return the active user."""
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
            headers=_AUTH_HEADER,
        )

    user = get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
            headers=_AUTH_HEADER,
        )

    return user
