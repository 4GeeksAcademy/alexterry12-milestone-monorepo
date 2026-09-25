"""TrackFlow inventory routes — products and stock movements."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select

from app.database import get_db
from app.dependencies import get_current_user
from app.models import SKU, StockEntry, StockExit
from app.schemas import (
    SKUCreate,
    SKURead,
    SKUSummary,
    StockEntryCreate,
    StockEntryRead,
    StockExitCreate,
    StockExitRead,
    StockMovementRead,
    User,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _sku_summary(sku: SKU) -> SKUSummary:
    return SKUSummary(
        id=sku.id,
        name=sku.name,
        sku=sku.sku,
        client_name=sku.client_name,
        warehouse=sku.warehouse,
    )


def _sku_read(sku: SKU, current_stock: int) -> SKURead:
    return SKURead(
        id=sku.id,
        name=sku.name,
        sku=sku.sku,
        client_name=sku.client_name,
        category=sku.category,
        warehouse=sku.warehouse,
        current_stock=current_stock,
    )


def _entry_exit_sums():
    entry_sums = (
        select(
            StockEntry.sku_id,
            StockEntry.warehouse,
            func.coalesce(func.sum(StockEntry.quantity), 0).label("total"),
        )
        .group_by(StockEntry.sku_id, StockEntry.warehouse)
        .subquery()
    )
    exit_sums = (
        select(
            StockExit.sku_id,
            StockExit.warehouse,
            func.coalesce(func.sum(StockExit.quantity), 0).label("total"),
        )
        .group_by(StockExit.sku_id, StockExit.warehouse)
        .subquery()
    )
    return entry_sums, exit_sums


def _products_with_stock_stmt():
    entry_sums, exit_sums = _entry_exit_sums()
    current_stock = func.coalesce(entry_sums.c.total, 0) - func.coalesce(
        exit_sums.c.total, 0
    )
    return (
        select(SKU, current_stock.label("current_stock"))
        .outerjoin(
            entry_sums,
            (SKU.id == entry_sums.c.sku_id)
            & (SKU.warehouse == entry_sums.c.warehouse),
        )
        .outerjoin(
            exit_sums,
            (SKU.id == exit_sums.c.sku_id)
            & (SKU.warehouse == exit_sums.c.warehouse),
        )
    )


def _current_stock(session: Session, sku_id: int, warehouse: str) -> int:
    entries = session.exec(
        select(func.coalesce(func.sum(StockEntry.quantity), 0)).where(
            StockEntry.sku_id == sku_id,
            StockEntry.warehouse == warehouse,
        )
    ).one()
    exits = session.exec(
        select(func.coalesce(func.sum(StockExit.quantity), 0)).where(
            StockExit.sku_id == sku_id,
            StockExit.warehouse == warehouse,
        )
    ).one()
    return int(entries) - int(exits)


def _get_sku_or_404(session: Session, sku_id: int) -> SKU:
    sku = session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU {sku_id} not found.",
        )
    return sku


def _require_matching_warehouse(sku: SKU, warehouse: str) -> None:
    if sku.warehouse != warehouse:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"SKU '{sku.sku}' belongs to warehouse {sku.warehouse}, "
                f"not {warehouse}."
            ),
        )


@router.get("/products", response_model=list[SKURead])
def list_products(
    _: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> list[SKURead]:
    rows = session.exec(_products_with_stock_stmt()).all()
    return [_sku_read(sku, int(current_stock)) for sku, current_stock in rows]


@router.post("/products", response_model=SKURead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: SKUCreate,
    _: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> SKURead:
    existing = session.exec(select(SKU).where(SKU.sku == payload.sku)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SKU code '{payload.sku}' already exists.",
        )

    sku = SKU(
        name=payload.name,
        sku=payload.sku,
        client_name=payload.client_name,
        category=payload.category,
        warehouse=payload.warehouse,
    )
    session.add(sku)
    session.commit()
    session.refresh(sku)
    return _sku_read(sku, 0)


@router.get("/products/{id}", response_model=SKURead)
def get_product(
    id: int,
    _: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> SKURead:
    row = session.exec(
        _products_with_stock_stmt().where(SKU.id == id)
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU {id} not found.",
        )
    sku, current_stock = row
    return _sku_read(sku, int(current_stock))


@router.post(
    "/orders/inbound",
    response_model=StockEntryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound_order(
    payload: StockEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> StockEntryRead:
    sku = _get_sku_or_404(session, payload.sku_id)
    _require_matching_warehouse(sku, payload.warehouse)

    entry = StockEntry(
        sku_id=payload.sku_id,
        quantity=payload.quantity,
        reference=payload.reference,
        warehouse=payload.warehouse,
        user_uuid=current_user.id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return StockEntryRead(
        id=entry.id,
        sku_id=entry.sku_id,
        quantity=entry.quantity,
        reference=entry.reference,
        warehouse=entry.warehouse,
        created_at=entry.created_at,
        user_uuid=entry.user_uuid,
        sku=_sku_summary(sku),
    )


@router.post(
    "/orders/outbound",
    response_model=StockExitRead,
    status_code=status.HTTP_201_CREATED,
)
def create_outbound_order(
    payload: StockExitCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> StockExitRead:
    sku = session.exec(
        select(SKU).where(SKU.id == payload.sku_id).with_for_update()
    ).first()
    if sku is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SKU {payload.sku_id} not found.",
        )
    _require_matching_warehouse(sku, payload.warehouse)

    available = _current_stock(session, sku.id, sku.warehouse)
    if payload.quantity > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for SKU '{sku.sku}'. "
                f"Available: {available}, requested: {payload.quantity}."
            ),
        )

    exit_row = StockExit(
        sku_id=payload.sku_id,
        quantity=payload.quantity,
        exit_type=payload.exit_type,
        tracking_number=payload.tracking_number,
        warehouse=payload.warehouse,
        user_uuid=current_user.id,
    )
    session.add(exit_row)
    session.commit()
    session.refresh(exit_row)
    return StockExitRead(
        id=exit_row.id,
        sku_id=exit_row.sku_id,
        quantity=exit_row.quantity,
        exit_type=exit_row.exit_type,
        tracking_number=exit_row.tracking_number,
        warehouse=exit_row.warehouse,
        created_at=exit_row.created_at,
        user_uuid=exit_row.user_uuid,
        sku=_sku_summary(sku),
    )


@router.get("/orders", response_model=list[StockMovementRead])
def list_orders(
    _: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> list[StockMovementRead]:
    entries = session.exec(
        select(StockEntry).options(selectinload(StockEntry.sku))
    ).all()
    exits = session.exec(
        select(StockExit).options(selectinload(StockExit.sku))
    ).all()

    movements: list[StockMovementRead] = []
    for entry in entries:
        movements.append(
            StockMovementRead(
                movement_type="entry",
                id=entry.id,
                sku_id=entry.sku_id,
                quantity=entry.quantity,
                warehouse=entry.warehouse,
                created_at=entry.created_at,
                user_uuid=entry.user_uuid,
                reference=entry.reference,
                sku=_sku_summary(entry.sku),
            )
        )
    for exit_row in exits:
        movements.append(
            StockMovementRead(
                movement_type="exit",
                id=exit_row.id,
                sku_id=exit_row.sku_id,
                quantity=exit_row.quantity,
                warehouse=exit_row.warehouse,
                created_at=exit_row.created_at,
                user_uuid=exit_row.user_uuid,
                exit_type=exit_row.exit_type,
                tracking_number=exit_row.tracking_number,
                sku=_sku_summary(exit_row.sku),
            )
        )
    movements.sort(key=lambda row: row.created_at, reverse=True)
    return movements
