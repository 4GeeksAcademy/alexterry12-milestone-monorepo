"""Tests for POST /auth/login, GET /auth/me, and the password flows."""

from __future__ import annotations

from tests.conftest import (
    expired_token_for,
    login_header,
    register_user,
    reset_token_from_inbox,
)

GENERIC_FORGOT_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)


def test_login_happy_path(client):
    user = register_user(client)
    response = client.post(
        "/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    assert response.status_code == 200
    token = response.json().get("access_token")
    # A usable token is the decision login makes — not merely a 200.
    assert token
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == user["email"]


def test_login_edge_empty_password(client):
    user = register_user(client)
    response = client.post(
        "/auth/login",
        json={"email": user["email"], "password": ""},
    )
    assert response.status_code != 200
    assert "access_token" not in (response.json() if response.content else {})


def test_login_failure_wrong_password(client):
    user = register_user(client)
    response = client.post(
        "/auth/login",
        json={"email": user["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_me_happy_path(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == user["email"]
    assert body["role"] == "user"


def test_me_edge_deleted_user_token(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    deleted = client.delete(f"/users/{user['id']}", headers=headers)
    assert deleted.status_code == 204
    # The JWT is still well-formed; the user no longer exists, so it must not work.
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401


def test_me_failure_expired_token(client):
    user = register_user(client)
    token = expired_token_for(user["id"])
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_forgot_password_happy_path(client, sent_emails, db_tables):
    user = register_user(client)
    response = client.post("/auth/forgot-password", json={"email": user["email"]})
    assert response.status_code == 200
    assert response.json()["message"] == GENERIC_FORGOT_MESSAGE
    assert len(sent_emails) == 1
    assert sent_emails[0][0] == user["email"]
    # The store keeps only a hash — a row existing means a reset was issued.
    assert len(db_tables["password_reset_tokens"].all()) == 1
    assert reset_token_from_inbox(sent_emails)


def test_forgot_password_edge_unknown_email(client, sent_emails, db_tables):
    known = register_user(client)
    known_response = client.post(
        "/auth/forgot-password", json={"email": known["email"]}
    )
    sent_emails.clear()
    db_tables["password_reset_tokens"].truncate()

    response = client.post(
        "/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == known_response.status_code
    # Same wording whether or not the account exists — no enumeration.
    assert response.json()["message"] == known_response.json()["message"]
    assert sent_emails == []
    assert db_tables["password_reset_tokens"].all() == []


def test_forgot_password_failure_malformed_email(client, sent_emails, db_tables):
    response = client.post(
        "/auth/forgot-password",
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422
    assert sent_emails == []
    assert db_tables["password_reset_tokens"].all() == []


def test_reset_password_happy_path(client, sent_emails):
    user = register_user(client)
    client.post("/auth/forgot-password", json={"email": user["email"]})
    raw_token = reset_token_from_inbox(sent_emails)
    new_password = "newpass123"
    response = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": new_password},
    )
    assert response.status_code == 200
    old_login = client.post(
        "/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/auth/login",
        json={"email": user["email"], "password": new_password},
    )
    assert new_login.status_code == 200
    assert new_login.json().get("access_token")


def test_reset_password_edge_token_reuse(client, sent_emails):
    user = register_user(client)
    client.post("/auth/forgot-password", json={"email": user["email"]})
    raw_token = reset_token_from_inbox(sent_emails)
    first = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "firstpass1"},
    )
    assert first.status_code == 200
    reuse = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "secondpass1"},
    )
    assert reuse.status_code == 400
    # The first reset must still be the live password.
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": "firstpass1"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": "secondpass1"},
        ).status_code
        == 401
    )


def test_reset_password_failure_invalid_or_expired_token(client):
    user = register_user(client)
    response = client.post(
        "/auth/reset-password",
        json={"token": "this-token-was-never-issued", "new_password": "newpass123"},
    )
    assert response.status_code == 400
    # Password must be unchanged when the token is rejected.
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": user["password"]},
        ).status_code
        == 200
    )


def test_change_password_happy_path(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    new_password = "changedpass1"
    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": user["password"],
            "new_password": new_password,
        },
    )
    assert response.status_code == 200
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": user["password"]},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": new_password},
        ).status_code
        == 200
    )


def test_change_password_edge_no_token(client):
    user = register_user(client)
    response = client.post(
        "/auth/change-password",
        json={
            "current_password": user["password"],
            "new_password": "changedpass1",
        },
    )
    assert response.status_code == 401
    # Unauthenticated request must not change the stored password.
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": user["password"]},
        ).status_code
        == 200
    )


def test_change_password_failure_wrong_current_password(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.post(
        "/auth/change-password",
        headers=headers,
        json={
            "current_password": "not-the-current-password",
            "new_password": "changedpass1",
        },
    )
    assert response.status_code == 400
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": user["password"]},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/auth/login",
            json={"email": user["email"], "password": "changedpass1"},
        ).status_code
        == 401
    )
