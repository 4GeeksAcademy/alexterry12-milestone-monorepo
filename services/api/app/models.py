"""Pydantic models for the TrackFlow supplier directory."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from incident_rules import (
    ALLOWED_STATUS_TRANSITIONS,
    BRANCH_LABELS,
    VALID_INCIDENT_BRANCHES,
    VALID_INCIDENT_CATEGORIES,
    VALID_INCIDENT_ORIGINS,
    VALID_INCIDENT_STATUSES,
)

VALID_CATEGORIES = [
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]

VALID_STATUSES = ["active", "suspended"]

SupplierCategory = Literal[
    "carrier_last_mile",
    "carrier_international",
    "warehouse_supplies",
    "packaging_materials",
    "reverse_logistics",
    "fleet_maintenance",
    "it_and_wms_software",
    "cleaning_and_facilities",
]

SupplierCountry = Literal["USA", "Spain"]
SupplierCurrency = Literal["USD", "EUR"]
SupplierStatus = Literal["active", "suspended"]


class SupplierCreate(BaseModel):
    """Payload a client sends to create a supplier. Does not include updated_at."""

    name: str = Field(..., min_length=1)
    country: SupplierCountry
    categories: list[SupplierCategory] = Field(..., min_length=1)
    rate_per_shipment: float = Field(..., gt=0)
    currency: SupplierCurrency
    status: SupplierStatus
    service_zone: str | None = None
    contact_email: str | None = None
    notes: str | None = None

    @field_validator("categories")
    @classmethod
    def categories_must_be_known(cls, value: list[SupplierCategory]) -> list[SupplierCategory]:
        unknown = [c for c in value if c not in VALID_CATEGORIES]
        if unknown:
            raise ValueError(f"Invalid categories: {unknown}")
        return value

    @model_validator(mode="after")
    def currency_must_match_country(self) -> SupplierCreate:
        if self.country == "USA" and self.currency != "USD":
            raise ValueError('A supplier from "USA" must have currency = "USD"')
        if self.country == "Spain" and self.currency != "EUR":
            raise ValueError('A supplier from "Spain" must have currency = "EUR"')
        return self


class Supplier(BaseModel):
    """Supplier as returned by the API, including server-set updated_at."""

    name: str
    country: SupplierCountry
    categories: list[SupplierCategory]
    rate_per_shipment: float
    currency: SupplierCurrency
    status: SupplierStatus
    updated_at: datetime
    service_zone: str | None = None
    contact_email: str | None = None
    notes: str | None = None


IncidentStatus = Literal[
    VALID_INCIDENT_STATUSES[0],
    VALID_INCIDENT_STATUSES[1],
    VALID_INCIDENT_STATUSES[2],
    VALID_INCIDENT_STATUSES[3],
]

IncidentOrigin = Literal[
    VALID_INCIDENT_ORIGINS[0],
    VALID_INCIDENT_ORIGINS[1],
    VALID_INCIDENT_ORIGINS[2],
]

IncidentBranch = Literal[
    VALID_INCIDENT_BRANCHES[0],
    VALID_INCIDENT_BRANCHES[1],
    VALID_INCIDENT_BRANCHES[2],
    VALID_INCIDENT_BRANCHES[3],
    VALID_INCIDENT_BRANCHES[4],
]

IncidentCategory = Literal[
    VALID_INCIDENT_CATEGORIES[0],
    VALID_INCIDENT_CATEGORIES[1],
    VALID_INCIDENT_CATEGORIES[2],
    VALID_INCIDENT_CATEGORIES[3],
    VALID_INCIDENT_CATEGORIES[4],
    VALID_INCIDENT_CATEGORIES[5],
    VALID_INCIDENT_CATEGORIES[6],
    VALID_INCIDENT_CATEGORIES[7],
    VALID_INCIDENT_CATEGORIES[8],
]


class IncidentCreate(BaseModel):
    """Payload a client sends to create an incident. Does not include timestamps."""

    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    category: IncidentCategory
    origin: IncidentOrigin
    branch: IncidentBranch
    status: IncidentStatus = "open"


class Incident(BaseModel):
    """Incident as returned by the API, including server-set timestamps."""

    title: str
    description: str
    category: IncidentCategory
    origin: IncidentOrigin
    branch: IncidentBranch
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
