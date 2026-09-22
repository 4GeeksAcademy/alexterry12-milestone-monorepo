"""Tests for the /users/ routes that depend on a logged-in caller."""

from __future__ import annotations

from tests.conftest import (
    admin_header,
    body_leaks_secret,
    login_header,
    register_user,
)


def test_create_user_happy_path(client, db_tables):
    email = "new.user@example.com"
    response = client.post(
        "/users/",
        json={
            "email": email,
            "password": "password123",
            "name": "New User",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body.get("id")
    assert "password" not in body
    assert "hashed_password" not in body
    # A row in the throwaway store is the create decision, not just the 201.
    stored = [
        row for row in db_tables["users"].all() if row.get("email") == email
    ]
    assert len(stored) == 1
    assert stored[0]["hashed_password"]
    assert stored[0]["hashed_password"] != "password123"


def test_create_user_edge_duplicate_email(client, db_tables):
    first = register_user(client, email="dup@example.com")
    response = client.post(
        "/users/",
        json={"email": first["email"], "password": "password123"},
    )
    assert response.status_code == 400
    matches = [
        row
        for row in db_tables["users"].all()
        if row.get("email") == first["email"]
    ]
    assert len(matches) == 1


def test_create_user_failure_missing_password(client, db_tables):
    response = client.post(
        "/users/",
        json={"email": "nopass@example.com", "name": "No Password"},
    )
    assert response.status_code == 422
    assert db_tables["users"].all() == []


def test_list_users_happy_path(client):
    first = register_user(client)
    second = register_user(client)
    headers = login_header(client, first["email"], first["password"])
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200
    emails = {row["email"] for row in response.json()}
    assert first["email"] in emails
    assert second["email"] in emails


def test_list_users_edge_no_password_hash_in_response(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200
    # Listing every user must still hide the stored hash.
    assert not body_leaks_secret(response.json())


def test_list_users_failure_no_token(client):
    register_user(client)
    response = client.get("/users/")
    assert response.status_code == 401


def test_get_user_happy_path(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.get(f"/users/{user['id']}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user["id"]
    assert body["email"] == user["email"]
    assert not body_leaks_secret(body)


def test_get_user_edge_unknown_id(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.get(
        "/users/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert response.status_code == 404


def test_get_user_failure_no_token(client):
    user = register_user(client)
    response = client.get(f"/users/{user['id']}")
    assert response.status_code == 401


def test_update_user_happy_path(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    new_email = "updated@example.com"
    response = client.put(
        f"/users/{user['id']}",
        headers=headers,
        json={"email": new_email},
    )
    assert response.status_code == 200
    assert response.json()["email"] == new_email
    fetched = client.get(f"/users/{user['id']}", headers=headers)
    assert fetched.json()["email"] == new_email


def test_update_user_edge_non_admin_role_change(client):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.put(
        f"/users/{user['id']}",
        headers=headers,
        json={"role": "admin"},
    )
    assert response.status_code == 403
    # Role stays user — the 403 is the ownership/admin decision.
    fetched = client.get(f"/users/{user['id']}", headers=headers)
    assert fetched.json()["role"] == "user"


def test_update_user_failure_other_user_as_non_admin(client):
    actor = register_user(client)
    target = register_user(client, email="other@example.com")
    headers = login_header(client, actor["email"], actor["password"])
    response = client.put(
        f"/users/{target['id']}",
        headers=headers,
        json={"email": "hijacked@example.com"},
    )
    assert response.status_code == 403
    target_headers = login_header(client, target["email"], target["password"])
    fetched = client.get(f"/users/{target['id']}", headers=target_headers)
    assert fetched.json()["email"] == target["email"]


def test_delete_user_happy_path(client, db_tables):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    response = client.delete(f"/users/{user['id']}", headers=headers)
    assert response.status_code == 204
    assert [row for row in db_tables["users"].all() if row.get("id") == user["id"]] == []
    # Linked profile must go with the user.
    assert [
        row
        for row in db_tables["profiles"].all()
        if row.get("user_id") == user["id"]
    ] == []


def test_delete_user_edge_already_deleted(client, db_tables):
    target = register_user(client)
    headers = admin_header(client, db_tables)
    first = client.delete(f"/users/{target['id']}", headers=headers)
    assert first.status_code == 204
    second = client.delete(f"/users/{target['id']}", headers=headers)
    assert second.status_code == 404


def test_delete_user_failure_other_user_as_non_admin(client, db_tables):
    actor = register_user(client)
    target = register_user(client)
    headers = login_header(client, actor["email"], actor["password"])
    response = client.delete(f"/users/{target['id']}", headers=headers)
    assert response.status_code == 403
    assert any(row.get("id") == target["id"] for row in db_tables["users"].all())
