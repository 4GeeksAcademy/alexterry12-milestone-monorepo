"""Pydantic models for the TrackFlow company API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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
