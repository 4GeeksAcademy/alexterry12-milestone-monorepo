"""Pydantic models for the TrackFlow company API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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


Role = Literal["admin", "manager", "user"]


class UserCreate(BaseModel):
    """Payload to register a user. Profile fields are not stored on User."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class User(BaseModel):
    """User as stored in TinyDB (includes hashed_password)."""

    id: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    role: Role = "user"
    created_at: datetime


class UserPublic(BaseModel):
    """User as returned by the API — never includes hashed_password."""

    id: str
    email: EmailStr
    is_active: bool = True
    role: Role = "user"
    created_at: datetime


class ProfileCreate(BaseModel):
    """Optional profile fields for create/update payloads."""

    name: str | None = None
    phone: str | None = None
    address: str | None = None


class Profile(BaseModel):
    """Profile as stored in TinyDB — name/phone/address live here only."""

    id: str
    user_id: str
    name: str | None = None
    phone: str | None = None
    address: str | None = None


class PasswordResetToken(BaseModel):
    """One-time password reset token as stored in TinyDB (token_hash only)."""

    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None
    created_at: datetime


# --- TrackFlow inventory schemas ---

SKUCategory = Literal["fashion", "electronics", "cosmetics"]
Warehouse = Literal["LA", "ZGZ"]
ExitType = Literal["dispatch", "loss"]


class SKUCreate(BaseModel):
    """Payload a client sends to create a product. Does not include id or stock."""

    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    client_name: str = Field(..., min_length=1)
    category: SKUCategory
    warehouse: Warehouse


class SKURead(BaseModel):
    """Product as returned by the API, including computed current_stock."""

    id: int
    name: str
    sku: str
    client_name: str
    category: SKUCategory
    warehouse: Warehouse
    current_stock: int


class SKUSummary(BaseModel):
    """Nested product data inside movement responses."""

    id: int
    name: str
    sku: str
    client_name: str
    warehouse: Warehouse


class StockEntryCreate(BaseModel):
    """Payload a client sends to create an inbound order. Server sets user_uuid and created_at."""

    sku_id: int
    quantity: int = Field(..., gt=0)
    reference: str = Field(..., min_length=1)
    warehouse: Warehouse


class StockExitCreate(BaseModel):
    """Payload a client sends to create an outbound order. Server sets user_uuid and created_at."""

    sku_id: int
    quantity: int = Field(..., gt=0)
    exit_type: ExitType
    tracking_number: str | None = None
    warehouse: Warehouse

    @model_validator(mode="after")
    def tracking_number_must_match_exit_type(self) -> StockExitCreate:
        if self.exit_type == "dispatch" and (self.tracking_number is None or not self.tracking_number.strip()):
            raise ValueError("tracking_number is required when exit_type is 'dispatch'.")
        if self.exit_type == "loss" and self.tracking_number is not None:
            raise ValueError("tracking_number must be null when exit_type is 'loss'.")
        return self


class StockEntryRead(BaseModel):
    """Inbound movement as returned by the API."""

    id: int
    sku_id: int
    quantity: int
    reference: str
    warehouse: Warehouse
    created_at: datetime
    user_uuid: str
    sku: SKUSummary


class StockExitRead(BaseModel):
    """Outbound movement as returned by the API."""

    id: int
    sku_id: int
    quantity: int
    exit_type: ExitType
    tracking_number: str | None
    warehouse: Warehouse
    created_at: datetime
    user_uuid: str
    sku: SKUSummary


class StockMovementRead(BaseModel):
    """One row in the combined inbound/outbound movements list."""

    movement_type: Literal["entry", "exit"]
    id: int
    sku_id: int
    quantity: int
    warehouse: Warehouse
    created_at: datetime
    user_uuid: str
    reference: str | None = None
    exit_type: ExitType | None = None
    tracking_number: str | None = None
    sku: SKUSummary
