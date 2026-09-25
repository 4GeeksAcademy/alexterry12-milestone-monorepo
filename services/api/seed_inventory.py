"""Seed Supabase with TrackFlow inventory SKUs and stock movements."""

from __future__ import annotations

import sys

from sqlmodel import Session, SQLModel, func, select

SKUS_SEED = [
    {
        "name": "Classic White Sneaker - Size 42",
        "sku": "CLT-SNK-W-42",
        "client_name": "PureStep Footwear",
        "category": "fashion",
        "warehouse": "LA",
    },
    {
        "name": "Classic White Sneaker - Size 42",
        "sku": "CLT-SNK-W-42-Z",
        "client_name": "PureStep Footwear",
        "category": "fashion",
        "warehouse": "ZGZ",
    },
    {
        "name": "Wireless Earbuds Pro",
        "sku": "TEC-EAR-001",
        "client_name": "SoundWave Electronics",
        "category": "electronics",
        "warehouse": "LA",
    },
    {
        "name": "Hydrating Face Serum 30ml",
        "sku": "CSM-SRM-030",
        "client_name": "GlowLab Cosmetics",
        "category": "cosmetics",
        "warehouse": "ZGZ",
    },
    {
        "name": "Slim Fit Chino - Navy 32/32",
        "sku": "CLT-CHN-N-32",
        "client_name": "UrbanThread",
        "category": "fashion",
        "warehouse": "LA",
    },
    {
        "name": "USB-C Fast Charger 65W",
        "sku": "TEC-CHG-065",
        "client_name": "SoundWave Electronics",
        "category": "electronics",
        "warehouse": "ZGZ",
    },
]

ENTRIES_SEED = [
    {"sku": "CLT-SNK-W-42", "quantity": 20, "reference": "PO-2024-0098", "warehouse": "LA"},
    {"sku": "CLT-SNK-W-42", "quantity": 12, "reference": "GR-LA-0234", "warehouse": "LA"},
    {"sku": "CLT-SNK-W-42-Z", "quantity": 15, "reference": "PO-2024-0112", "warehouse": "ZGZ"},
    {"sku": "TEC-EAR-001", "quantity": 40, "reference": "GR-LA-0241", "warehouse": "LA"},
    {"sku": "CSM-SRM-030", "quantity": 60, "reference": "GR-ZGZ-0087", "warehouse": "ZGZ"},
]

EXITS_SEED = [
    {
        "sku": "CLT-SNK-W-42",
        "quantity": 5,
        "exit_type": "dispatch",
        "tracking_number": "1Z999AA10123456784",
        "warehouse": "LA",
    },
    {
        "sku": "TEC-EAR-001",
        "quantity": 2,
        "exit_type": "loss",
        "tracking_number": None,
        "warehouse": "LA",
    },
    {
        "sku": "CSM-SRM-030",
        "quantity": 10,
        "exit_type": "dispatch",
        "tracking_number": "1Z999AA10123456791",
        "warehouse": "ZGZ",
    },
]


def main() -> int:
    # Imported here rather than at module scope so a missing DATABASE_URL
    # is reported as a message instead of an import-time traceback.
    try:
        from app.database import engine, users_table
        from app.models import SKU, StockEntry, StockExit
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    SQLModel.metadata.create_all(engine)

    users = users_table.all()
    if not users:
        print("No users found in TinyDB. Register a user first, then re-run.")
        return 1

    first_user = dict(users[0])
    user_uuid = first_user["id"]
    print(f"Using user {first_user['email']} for seeded movements.")

    with Session(engine) as session:
        existing = session.exec(select(SKU).limit(1)).first()
        if existing is not None:
            print("Inventory already seeded. Nothing to do.")
            return 0

        sku_by_code: dict[str, SKU] = {}
        for raw in SKUS_SEED:
            sku = SKU(**raw)
            session.add(sku)
            sku_by_code[raw["sku"]] = sku
        session.flush()

        for raw in ENTRIES_SEED:
            sku = sku_by_code[raw["sku"]]
            session.add(
                StockEntry(
                    sku_id=sku.id,
                    quantity=raw["quantity"],
                    reference=raw["reference"],
                    warehouse=raw["warehouse"],
                    user_uuid=user_uuid,
                )
            )

        for raw in EXITS_SEED:
            sku = sku_by_code[raw["sku"]]
            session.add(
                StockExit(
                    sku_id=sku.id,
                    quantity=raw["quantity"],
                    exit_type=raw["exit_type"],
                    tracking_number=raw["tracking_number"],
                    warehouse=raw["warehouse"],
                    user_uuid=user_uuid,
                )
            )

        session.commit()

        print("Seeded 6 SKUs, 5 inbound movements, and 3 outbound movements.")
        print()
        header = f"{'sku':<16} {'wh':<4} {'in':>6} {'out':>6} {'stock':>6}"
        print(header)
        print("-" * len(header))

        skus = session.exec(select(SKU).order_by(SKU.sku)).all()
        for sku in skus:
            total_in = session.exec(
                select(func.coalesce(func.sum(StockEntry.quantity), 0)).where(
                    StockEntry.sku_id == sku.id,
                    StockEntry.warehouse == sku.warehouse,
                )
            ).one()
            total_out = session.exec(
                select(func.coalesce(func.sum(StockExit.quantity), 0)).where(
                    StockExit.sku_id == sku.id,
                    StockExit.warehouse == sku.warehouse,
                )
            ).one()
            current_stock = int(total_in) - int(total_out)
            print(
                f"{sku.sku:<16} {sku.warehouse:<4} {int(total_in):>6} "
                f"{int(total_out):>6} {current_stock:>6}"
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
