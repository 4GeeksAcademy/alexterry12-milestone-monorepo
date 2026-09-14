"""User and profile persistence for the TrackFlow company API."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from tinydb import Query

from app.database import profiles_table, users_table
from app.models import Profile, ProfileCreate, Role, User, UserCreate
from app.security import hash_password

_user_query = Query()
_profile_query = Query()


def _user_from_doc(doc: dict) -> User:
    """Build a User model from a TinyDB document."""
    return User.model_validate(dict(doc))


def _profile_from_doc(doc: dict) -> Profile:
    """Build a Profile model from a TinyDB document."""
    return Profile.model_validate(dict(doc))


def _find_user_doc(user_id: str) -> dict | None:
    matches = users_table.search(_user_query.id == user_id)
    if not matches:
        return None
    return dict(matches[0])


def create_user(payload: UserCreate) -> User:
    """Create a user and linked profile. Raises ValueError if email exists."""
    if get_user_by_email(str(payload.email)) is not None:
        raise ValueError("Email already registered.")

    user_id = str(uuid4())
    profile_id = str(uuid4())
    now = datetime.now(timezone.utc)

    user_record = {
        "id": user_id,
        "email": str(payload.email),
        "hashed_password": hash_password(payload.password),
        "is_active": True,
        "role": "user",
        "created_at": now.isoformat(),
    }
    profile_record = {
        "id": profile_id,
        "user_id": user_id,
        "name": payload.name,
        "phone": payload.phone,
        "address": payload.address,
    }

    users_table.insert(user_record)
    profiles_table.insert(profile_record)
    return _user_from_doc(user_record)


def get_user_by_id(user_id: str) -> User | None:
    """Return a user by id, or None if not found."""
    doc = _find_user_doc(user_id)
    if doc is None:
        return None
    return _user_from_doc(doc)


def get_user_by_email(email: str) -> User | None:
    """Return a user by email, or None if not found."""
    matches = users_table.search(_user_query.email == email)
    if not matches:
        return None
    return _user_from_doc(dict(matches[0]))


def list_users() -> list[User]:
    """Return every user in the directory."""
    return [_user_from_doc(dict(doc)) for doc in users_table.all()]


def update_user(
    user_id: str,
    *,
    email: str | None = None,
    role: Role | None = None,
) -> User | None:
    """Update email and/or role. Returns None if the user does not exist."""
    doc = _find_user_doc(user_id)
    if doc is None:
        return None

    patch: dict[str, str] = {}
    if email is not None:
        patch["email"] = email
    if role is not None:
        patch["role"] = role

    if patch:
        users_table.update(patch, _user_query.id == user_id)

    updated = _find_user_doc(user_id)
    return _user_from_doc(updated) if updated is not None else None


def set_user_password(user_id: str, plain_password: str) -> User | None:
    """Hash and store a new password. Returns None if the user does not exist."""
    if _find_user_doc(user_id) is None:
        return None

    users_table.update(
        {"hashed_password": hash_password(plain_password)},
        _user_query.id == user_id,
    )
    updated = _find_user_doc(user_id)
    return _user_from_doc(updated) if updated is not None else None


def delete_user(user_id: str) -> bool:
    """Delete a user and linked profile. Returns False if the user was missing."""
    if _find_user_doc(user_id) is None:
        return False

    users_table.remove(_user_query.id == user_id)
    profiles_table.remove(_profile_query.user_id == user_id)
    return True


def get_profile_by_user_id(user_id: str) -> Profile | None:
    """Return the profile for a user, or None if not found."""
    matches = profiles_table.search(_profile_query.user_id == user_id)
    if not matches:
        return None
    return _profile_from_doc(dict(matches[0]))


def update_profile(user_id: str, payload: ProfileCreate) -> Profile | None:
    """Update name, phone, and address for a user's profile."""
    matches = profiles_table.search(_profile_query.user_id == user_id)
    if not matches:
        return None

    patch = payload.model_dump()
    profiles_table.update(patch, _profile_query.user_id == user_id)

    updated = profiles_table.search(_profile_query.user_id == user_id)
    if not updated:
        return None
    return _profile_from_doc(dict(updated[0]))
