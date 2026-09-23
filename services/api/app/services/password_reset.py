"""Password-reset token persistence for the TrackFlow company API."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from tinydb import Query

from app.database import password_reset_tokens_table
from app.models import PasswordResetToken

_token_query = Query()


def _token_from_doc(doc: dict) -> PasswordResetToken:
    """Build a PasswordResetToken model from a TinyDB document."""
    return PasswordResetToken.model_validate(dict(doc))


def create_password_reset_token(user_id: str, token_hash: str) -> PasswordResetToken:
    """Insert a new unused reset token that expires in 30 minutes."""
    now = datetime.now(timezone.utc)
    record = {
        "id": str(uuid4()),
        "user_id": user_id,
        "token_hash": token_hash,
        "expires_at": (now + timedelta(minutes=30)).isoformat(),
        "used_at": None,
        "created_at": now.isoformat(),
    }
    password_reset_tokens_table.insert(record)
    return _token_from_doc(record)


def get_password_reset_token_by_hash(token_hash: str) -> PasswordResetToken | None:
    """Return a reset token by its SHA-256 hash, or None if not found."""
    matches = password_reset_tokens_table.search(
        _token_query.token_hash == token_hash
    )
    if not matches:
        return None
    return _token_from_doc(dict(matches[0]))


def mark_password_reset_token_used(token_id: str) -> PasswordResetToken | None:
    """Set used_at to now. Returns None if the token id does not exist."""
    matches = password_reset_tokens_table.search(_token_query.id == token_id)
    if not matches:
        return None

    now = datetime.now(timezone.utc).isoformat()
    password_reset_tokens_table.update({"used_at": now}, _token_query.id == token_id)

    updated = password_reset_tokens_table.search(_token_query.id == token_id)
    if not updated:
        return None
    return _token_from_doc(dict(updated[0]))
