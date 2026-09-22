"""Tests for GET and PUT /profiles/me."""

from __future__ import annotations

from tinydb import Query

from tests.conftest import login_header, register_user


def test_get_my_profile_happy_path(client):
    user = register_user(
        client,
        name="Valentina Cruz",
        phone="555-0100",
        address="Zaragoza",
    )
    headers = login_header(client, user["email"], user["password"])
    response = client.get("/profiles/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == user["id"]
    assert body["name"] == "Valentina Cruz"
    assert body["phone"] == "555-0100"
    assert body["address"] == "Zaragoza"


def test_get_my_profile_edge_profile_deleted(client, db_tables):
    user = register_user(client)
    headers = login_header(client, user["email"], user["password"])
    db_tables["profiles"].remove(Query().user_id == user["id"])
    response = client.get("/profiles/me", headers=headers)
    # Missing profile is a not-found for that user, not an unhandled crash.
    assert response.status_code == 404
    assert "profile" in response.json()["detail"].lower()


def test_get_my_profile_failure_no_token(client):
    register_user(client)
    response = client.get("/profiles/me")
    assert response.status_code == 401


def test_update_my_profile_happy_path(client):
    user = register_user(
        client,
        name="Old Name",
        phone="555-0000",
        address="Old Street",
    )
    headers = login_header(client, user["email"], user["password"])
    response = client.put(
        "/profiles/me",
        headers=headers,
        json={
            "name": "New Name",
            "phone": "555-9999",
            "address": "New Street",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "New Name"
    assert body["phone"] == "555-9999"
    assert body["address"] == "New Street"
    fetched = client.get("/profiles/me", headers=headers)
    assert fetched.json()["name"] == "New Name"


def test_update_my_profile_edge_empty_body(client):
    user = register_user(
        client,
        name="Keep Me",
        phone="555-0100",
        address="1 Main Street",
    )
    headers = login_header(client, user["email"], user["password"])
    before = client.get("/profiles/me", headers=headers).json()
    response = client.put("/profiles/me", headers=headers, json={})
    assert response.status_code == 200
    after = response.json()
    # Empty body is a no-op: existing fields must survive (documented contract).
    assert after["name"] == before["name"] == "Keep Me"
    assert after["phone"] == before["phone"] == "555-0100"
    assert after["address"] == before["address"] == "1 Main Street"


def test_update_my_profile_failure_no_token(client):
    user = register_user(client, name="Keep Me")
    response = client.put(
        "/profiles/me",
        json={"name": "Hijacked"},
    )
    assert response.status_code == 401
    headers = login_header(client, user["email"], user["password"])
    fetched = client.get("/profiles/me", headers=headers)
    assert fetched.json()["name"] == "Keep Me"
