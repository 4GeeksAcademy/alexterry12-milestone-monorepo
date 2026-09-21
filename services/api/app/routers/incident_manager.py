"""Centralized incident manager routes (CRUD + summary)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query, status
from pydantic import BaseModel, ValidationError

from app.database import incidents_table
from app.models import (
    ALLOWED_STATUS_TRANSITIONS,
    VALID_INCIDENT_BRANCHES,
    VALID_INCIDENT_CATEGORIES,
    VALID_INCIDENT_ORIGINS,
    VALID_INCIDENT_STATUSES,
    IncidentCreate,
    IncidentStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/incidents", tags=["incident-manager"])

# Fixed client-facing message for store failures. Details go to the log only.
_STORE_ERROR = "An unexpected error occurred. Please try again."


def _store_error(operation: str) -> HTTPException:
    """Log the real store failure (call from an except block) and return a 500."""
    logger.exception("Incident store operation failed: %s", operation)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=_STORE_ERROR,
    )


class StatusUpdate(BaseModel):
    status: IncidentStatus


def _public_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Strip bookkeeping fields that must never appear in API responses."""
    cleaned = dict(doc)
    cleaned.pop("source_incident_id", None)
    return cleaned


def _with_id(doc_id: int, doc: dict[str, Any]) -> dict[str, Any]:
    return {"id": doc_id, **_public_doc(doc)}


def _get_or_404(incident_id: int) -> tuple[int, dict[str, Any]]:
    try:
        doc = incidents_table.get(doc_id=incident_id)
    except (OSError, ValueError) as exc:
        raise _store_error("read incident") from exc

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with id {incident_id} not found.",
        )
    return incident_id, dict(doc)


def _validation_error_detail(exc: ValidationError) -> dict[str, str]:
    """Map the first Pydantic error to a plain-language field message."""
    errors = exc.errors()
    if not errors:
        return {"field": "body", "message": "The request body is invalid."}

    first = errors[0]
    loc = first.get("loc") or ()
    field = "body"
    for part in loc:
        if part != "body" and not isinstance(part, int):
            field = str(part)
            break

    err_type = first.get("type", "")
    if err_type == "missing":
        message = f"{field} is required."
    elif err_type in {"string_too_short", "value_error.any_str.min_length"}:
        message = f"{field} must not be empty."
    elif err_type in {"literal_error", "enum"}:
        message = f"{field} is not a valid value."
    else:
        # Avoid pydantic jargon / raw exception text in the API response.
        message = f"{field} is invalid."

    return {"field": field, "message": message}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    try:
        create = IncidentCreate.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_validation_error_detail(exc),
        ) from exc

    now = datetime.now(timezone.utc).isoformat()
    record = create.model_dump()
    record["created_at"] = now
    record["updated_at"] = now
    try:
        doc_id = incidents_table.insert(record)
        stored = incidents_table.get(doc_id=doc_id)
    except (OSError, ValueError) as exc:
        raise _store_error("insert incident") from exc

    return _with_id(doc_id, dict(stored) if stored else record)


@router.get("")
def list_incidents(
    status_filter: str | None = Query(default=None, alias="status"),
    origin: str | None = Query(default=None),
    branch: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    try:
        docs = incidents_table.all()
    except (OSError, ValueError) as exc:
        raise _store_error("list incidents") from exc

    results: list[dict[str, Any]] = []
    for doc in docs:
        item = dict(doc)
        if status_filter is not None and item.get("status") != status_filter:
            continue
        if origin is not None and item.get("origin") != origin:
            continue
        if branch is not None and item.get("branch") != branch:
            continue
        if category is not None and item.get("category") != category:
            continue
        results.append(_with_id(doc.doc_id, item))
    return results


@router.get("/summary")
def incidents_summary() -> dict[str, Any]:
    by_status = {key: 0 for key in VALID_INCIDENT_STATUSES}
    by_category = {key: 0 for key in VALID_INCIDENT_CATEGORIES}
    by_origin = {key: 0 for key in VALID_INCIDENT_ORIGINS}
    by_branch = {key: 0 for key in VALID_INCIDENT_BRANCHES}

    try:
        docs = incidents_table.all()
    except (OSError, ValueError) as exc:
        raise _store_error("summarize incidents") from exc

    total = 0
    for doc in docs:
        total += 1
        item = dict(doc)
        status_value = item.get("status")
        category_value = item.get("category")
        origin_value = item.get("origin")
        branch_value = item.get("branch")
        if status_value in by_status:
            by_status[status_value] += 1
        if category_value in by_category:
            by_category[category_value] += 1
        if origin_value in by_origin:
            by_origin[origin_value] += 1
        if branch_value in by_branch:
            by_branch[branch_value] += 1

    return {
        "total": total,
        "by_status": by_status,
        "by_category": by_category,
        "by_origin": by_origin,
        "by_branch": by_branch,
    }


@router.get("/{incident_id}")
def get_incident(incident_id: int) -> dict[str, Any]:
    doc_id, doc = _get_or_404(incident_id)
    return _with_id(doc_id, doc)


@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    payload: StatusUpdate,
) -> dict[str, Any]:
    _, doc = _get_or_404(incident_id)
    current_status = str(doc.get("status", ""))
    requested = payload.status
    allowed = ALLOWED_STATUS_TRANSITIONS.get(current_status, [])
    if requested not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "status",
                "message": (
                    f"Cannot move an incident from {current_status} to {requested}."
                ),
            },
        )

    try:
        incidents_table.update(
            {
                "status": requested,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            doc_ids=[incident_id],
        )
    except (OSError, ValueError) as exc:
        raise _store_error("update incident status") from exc

    _, updated = _get_or_404(incident_id)
    return _with_id(incident_id, updated)
