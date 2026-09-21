"""Supplier directory routes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import suppliers_table
from app.models import VALID_STATUSES, SupplierCreate, SupplierStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

# Fixed client-facing message for store failures. Details go to the log only.
_STORE_ERROR = "An unexpected error occurred. Please try again."


def _store_error(operation: str) -> HTTPException:
    """Log the real store failure (call from an except block) and return a 500."""
    logger.exception("Supplier store operation failed: %s", operation)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=_STORE_ERROR,
    )


class RateUpdate(BaseModel):
    rate_per_shipment: float = Field(..., gt=0)


class StatusUpdate(BaseModel):
    status: SupplierStatus


def _with_id(doc_id: int, doc: dict[str, Any]) -> dict[str, Any]:
    return {"id": doc_id, **doc}


def _get_or_404(supplier_id: int) -> tuple[int, dict[str, Any]]:
    try:
        doc = suppliers_table.get(doc_id=supplier_id)
    except (OSError, ValueError) as exc:
        raise _store_error("read supplier") from exc

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with id {supplier_id} not found.",
        )
    return supplier_id, dict(doc)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate) -> dict[str, Any]:
    record = payload.model_dump()
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        doc_id = suppliers_table.insert(record)
        stored = suppliers_table.get(doc_id=doc_id)
    except (OSError, ValueError) as exc:
        raise _store_error("insert supplier") from exc

    return _with_id(doc_id, dict(stored) if stored else record)


@router.get("/")
def list_suppliers(
    country: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    try:
        docs = suppliers_table.all()
    except (OSError, ValueError) as exc:
        raise _store_error("list suppliers") from exc

    results: list[dict[str, Any]] = []
    for doc in docs:
        item = dict(doc)
        if country is not None and item.get("country") != country:
            continue
        if category is not None:
            categories = item.get("categories") or []
            if category not in categories:
                continue
        results.append(_with_id(doc.doc_id, item))
    return results


@router.get("/{supplier_id}")
def get_supplier(supplier_id: int) -> dict[str, Any]:
    doc_id, doc = _get_or_404(supplier_id)
    return _with_id(doc_id, doc)


@router.patch("/{supplier_id}/rate")
def update_supplier_rate(supplier_id: int, payload: RateUpdate) -> dict[str, Any]:
    _get_or_404(supplier_id)
    try:
        suppliers_table.update(
            {
                "rate_per_shipment": payload.rate_per_shipment,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            doc_ids=[supplier_id],
        )
    except (OSError, ValueError) as exc:
        raise _store_error("update supplier rate") from exc

    _, doc = _get_or_404(supplier_id)
    return _with_id(supplier_id, doc)


@router.patch("/{supplier_id}/status")
def update_supplier_status(supplier_id: int, payload: StatusUpdate) -> dict[str, Any]:
    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of {VALID_STATUSES}.",
        )
    _get_or_404(supplier_id)
    try:
        suppliers_table.update({"status": payload.status}, doc_ids=[supplier_id])
    except (OSError, ValueError) as exc:
        raise _store_error("update supplier status") from exc

    _, doc = _get_or_404(supplier_id)
    return _with_id(supplier_id, doc)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int) -> None:
    _get_or_404(supplier_id)
    try:
        suppliers_table.remove(doc_ids=[supplier_id])
    except (OSError, ValueError) as exc:
        raise _store_error("delete supplier") from exc
