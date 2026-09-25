"""SQLModel ORM models (database tables) live here. Pydantic request/response schemas live in schemas.py."""

from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


class SKU(SQLModel, table=True):
    __tablename__ = "sku"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    sku: str = Field(index=True, unique=True)
    client_name: str
    category: str
    warehouse: str
    entries: list["StockEntry"] = Relationship(back_populates="sku")
    exits: list["StockExit"] = Relationship(back_populates="sku")


class StockEntry(SQLModel, table=True):
    __tablename__ = "stock_entry"

    id: int | None = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id", nullable=False)
    quantity: int
    reference: str
    warehouse: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str
    sku: SKU | None = Relationship(back_populates="entries")


class StockExit(SQLModel, table=True):
    __tablename__ = "stock_exit"

    id: int | None = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="sku.id", nullable=False)
    quantity: int
    exit_type: str
    tracking_number: str | None = None
    warehouse: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str
    sku: SKU | None = Relationship(back_populates="exits")
