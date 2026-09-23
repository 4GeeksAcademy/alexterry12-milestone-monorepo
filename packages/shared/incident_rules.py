"""Single source of truth for TrackFlow centralized incident manager rules."""

from __future__ import annotations

from incident_analysis.core import validate_row

VALID_INCIDENT_STATUSES = ["open", "in_progress", "resolved", "discarded"]

VALID_INCIDENT_ORIGINS = ["customer", "branch", "internal"]

VALID_INCIDENT_BRANCHES = [
    "central",
    "la_warehouse",
    "la_office",
    "zaragoza_warehouse",
    "zaragoza_office",
]

VALID_INCIDENT_CATEGORIES = [
    "lost_parcel",
    "delivery_failure",
    "inventory_discrepancy",
    "carrier_issue",
    "returns_issue",
    "warehouse_incident",
    "system_failure",
    "client_complaint",
    "other",
]

BRANCH_LABELS: dict[str, str] = {
    "central": "Central",
    "la_warehouse": "Los Angeles — Warehouse",
    "la_office": "Los Angeles — Office",
    "zaragoza_warehouse": "Zaragoza — Warehouse",
    "zaragoza_office": "Zaragoza — Office",
}

ALLOWED_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "open": ["in_progress", "discarded"],
    "in_progress": ["resolved", "discarded"],
    "resolved": [],
    "discarded": [],
}

CSV_STATUS_MAP = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

CSV_CATEGORY_MAP = {
    "LOST_PARCEL": "lost_parcel",
    "DELAYED_DELIVERY": "carrier_issue",
    "WRONG_ADDRESS": "delivery_failure",
    "RETURN_REQUEST": "returns_issue",
    "DAMAGE": "carrier_issue",
}

CSV_BRANCH_MAP = {
    "US": "la_office",
    "ES": "zaragoza_office",
}

__all__ = [
    "ALLOWED_STATUS_TRANSITIONS",
    "BRANCH_LABELS",
    "CSV_BRANCH_MAP",
    "CSV_CATEGORY_MAP",
    "CSV_STATUS_MAP",
    "VALID_INCIDENT_BRANCHES",
    "VALID_INCIDENT_CATEGORIES",
    "VALID_INCIDENT_ORIGINS",
    "VALID_INCIDENT_STATUSES",
    "validate_row",
]
