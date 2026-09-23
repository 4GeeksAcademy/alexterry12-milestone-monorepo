"""Shared fixtures for the AUTH-088 authentication API suite.

A MemoryStorage TinyDB is installed as ``app.database`` before the app is
imported, so tests never open ``suppliers.json``. Email sending is replaced
so Resend is never called.
"""

from __future__ import annotations

import os
import sys
import types
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

# Test values must be set before any app module calls load_dotenv (override=False).
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-auth-088"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["RESEND_API_KEY"] = "re_test_not_a_real_key"
os.environ["FRONTEND_URL"] = "http://test.local"

import bcrypt as _bcrypt_lib
from tinydb import TinyDB
from tinydb.storages import MemoryStorage


def _hash_password(plain_password: str) -> str:
    """bcrypt hash that does not go through passlib.

    passlib 1.7.4 + bcrypt 5.0 cannot hash at all (wrap-bug probe exceeds
    72 bytes). Tests still store and check real bcrypt hashes.
    """
    return _bcrypt_lib.hashpw(
        plain_password.encode("utf-8"),
        _bcrypt_lib.gensalt(),
    ).decode("utf-8")


def _verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt_lib.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )

_memory_db = TinyDB(storage=MemoryStorage)
_database_stub = types.ModuleType("app.database")
_database_stub.db = _memory_db
_database_stub.suppliers_table = _memory_db.table("suppliers")
_database_stub.users_table = _memory_db.table("users")
_database_stub.profiles_table = _memory_db.table("profiles")
_database_stub.password_reset_tokens_table = _memory_db.table(
    "password_reset_tokens"
)
sys.modules["app.database"] = _database_stub

import app.database as database  # noqa: E402
from app.main import app  # noqa: E402
from app.services import password_reset as password_reset_service  # noqa: E402
from app.services import users as users_service  # noqa: E402
from app.tokens import ALGORITHM  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from jose import jwt  # noqa: E402
import pytest  # noqa: E402
import resend  # noqa: E402

# If a future import order change rebinds these, tests would write to the real file.
assert users_service.users_table is _database_stub.users_table
assert users_service.profiles_table is _database_stub.profiles_table
assert (
    password_reset_service.password_reset_tokens_table
    is _database_stub.password_reset_tokens_table
)

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "adminpass123"

_SECRET_FIELD_NAMES = {"password", "hashed_password", "hash"}


def body_leaks_secret(payload: object) -> bool:
    """True if a response payload exposes a password or hash."""
    if isinstance(payload, dict):
        for key, value in payload.items():
            if str(key).lower() in _SECRET_FIELD_NAMES:
                return True
            if isinstance(value, str) and value.startswith("$2"):
                return True
            if body_leaks_secret(value):
                return True
    elif isinstance(payload, list):
        return any(body_leaks_secret(item) for item in payload)
    return False


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db_tables():
    return {
        "users": database.users_table,
        "profiles": database.profiles_table,
        "password_reset_tokens": database.password_reset_tokens_table,
        "suppliers": database.suppliers_table,
    }


@pytest.fixture(autouse=True)
def _clean_database(db_tables):
    for table in db_tables.values():
        table.truncate()
    yield
    for table in db_tables.values():
        table.truncate()


@pytest.fixture(autouse=True)
def sent_emails(monkeypatch):
    """Record reset emails; never call Resend."""
    inbox: list[tuple[str, str]] = []

    def fake_send(to_email: str, reset_url: str) -> None:
        inbox.append((to_email, reset_url))

    def refuse_real_send(*_args, **_kwargs):
        raise AssertionError("resend.Emails.send must not run during tests")

    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send)
    monkeypatch.setattr(resend.Emails, "send", refuse_real_send)
    return inbox


def register_user(
    client: TestClient,
    *,
    email: str | None = None,
    password: str = "password123",
    name: str = "Test User",
    phone: str = "555-0100",
    address: str = "1 Main Street",
) -> dict:
    """POST /users/ and return id, email, password, plus the public body."""
    chosen_email = email or f"user-{uuid4().hex}@example.com"
    response = client.post(
        "/users/",
        json={
            "email": chosen_email,
            "password": password,
            "name": name,
            "phone": phone,
            "address": address,
        },
    )
    if response.status_code != 201:
        raise AssertionError(
            f"register_user expected 201, got {response.status_code}: {response.text}"
        )
    body = response.json()
    return {
        "id": body["id"],
        "email": chosen_email,
        "password": password,
        "name": name,
        "phone": phone,
        "address": address,
        "body": body,
    }


def login_header(client: TestClient, email: str, password: str) -> dict[str, str]:
    """Log in and return an Authorization header dict."""
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    if response.status_code != 200:
        raise AssertionError(
            f"login expected 200, got {response.status_code}: {response.text}"
        )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed_admin(db_tables) -> dict:
    """Insert an admin directly into the throwaway store (role is not settable via POST /users)."""
    user_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db_tables["users"].insert(
        {
            "id": user_id,
            "email": ADMIN_EMAIL,
            "hashed_password": _hash_password(ADMIN_PASSWORD),
            "is_active": True,
            "role": "admin",
            "created_at": now,
        }
    )
    return {"id": user_id, "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}


def admin_header(client: TestClient, db_tables) -> dict[str, str]:
    admin = seed_admin(db_tables)
    return login_header(client, admin["email"], admin["password"])


def expired_token_for(user_id: str) -> str:
    """Build a JWT whose exp is already in the past, signed with the test secret."""
    expire_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    return jwt.encode(
        {"sub": user_id, "exp": expire_at},
        os.environ["JWT_SECRET_KEY"],
        algorithm=ALGORITHM,
    )


def reset_token_from_inbox(inbox: list[tuple[str, str]]) -> str:
    """Pull the raw reset token out of the faked email's URL."""
    if not inbox:
        raise AssertionError("expected a password-reset email to have been recorded")
    _to_email, reset_url = inbox[-1]
    token_values = parse_qs(urlparse(reset_url).query).get("token", [])
    if not token_values:
        raise AssertionError(f"reset URL had no token query param: {reset_url}")
    return token_values[0]
