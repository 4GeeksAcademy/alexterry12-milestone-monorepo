"""Seed TinyDB with the TrackFlow supplier directory from supplier_CONTEXT.md."""

from __future__ import annotations

import sys
from datetime import datetime, timezone

from pydantic import ValidationError
from tinydb import Query

from app.models import SupplierCreate

DB_ERROR = (
    "Error: could not open the supplier database. Check that "
    "services/api/suppliers.json exists and contains valid JSON."
)
DB_WRITE_ERROR = (
    "Error: could not write to the supplier database. Check that "
    "services/api/suppliers.json is writable and contains valid JSON."
)

SUPPLIERS_SEED = [
    {
        "name": "UPS Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Primary carrier for local deliveries in Los Angeles and surrounding areas.",
    },
    {
        "name": "FedEx Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com",
    },
    {
        "name": "DHL Express USA",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Used for urgent shipments and exports to Europe.",
    },
    {
        "name": "OnTrac",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Regional carrier. Best rate in the Los Angeles area.",
    },
    {
        "name": "Laser Ship",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspended. Incident rate above 8% in Q3.",
    },
    {
        "name": "PackSource LA",
        "country": "USA",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Boxes, filler, and tape for the Los Angeles warehouse.",
    },
    {
        "name": "CleanTeam West",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Monthly rate for LA warehouse cleaning service.",
    },
    {
        "name": "MRW España",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Primary carrier for deliveries in Spain. Volume-negotiated contract.",
    },
    {
        "name": "SEUR",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Península Ibérica + Baleares",
        "contact_email": "grandes.cuentas@seur.com",
    },
    {
        "name": "DHL Express España",
        "country": "Spain",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "España + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Urgent shipments and exports from Zaragoza.",
    },
    {
        "name": "Nacex",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragón y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Regional carrier with good coverage in Aragón.",
    },
    {
        "name": "Logística Inversa Iberia",
        "country": "Spain",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Returns management for the Zaragoza warehouse.",
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": "Spain",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es",
    },
    {
        "name": "SAP WM Cloud",
        "country": "USA",
        "categories": ["it_and_wms_software"],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspended. Andrés is evaluating lighter alternatives for the LA warehouse.",
    },
    {
        "name": "ReturnBear",
        "country": "USA",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Returns management for Los Angeles customers.",
    },
]


def main() -> int:
    # Imported here rather than at module scope so a store that cannot be opened
    # is reported as a message instead of an import-time traceback.
    try:
        from app.database import suppliers_table
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError):
        print(DB_ERROR, file=sys.stderr)
        return 1

    # Validate every entry before the first insert, so bad seed data cannot
    # leave the table half-written.
    suppliers: list[SupplierCreate] = []
    for index, raw in enumerate(SUPPLIERS_SEED, start=1):
        try:
            suppliers.append(SupplierCreate.model_validate(raw))
        except ValidationError:
            label = raw.get("name") or f"entry {index}"
            print(
                f"Error: seed data for {label!r} is not a valid supplier. "
                "Fix SUPPLIERS_SEED and run again.",
                file=sys.stderr,
            )
            return 1

    inserted = 0
    existing = Query()

    for supplier in suppliers:
        try:
            if suppliers_table.search(existing.name == supplier.name):
                continue

            record = supplier.model_dump()
            record["updated_at"] = datetime.now(timezone.utc).isoformat()
            suppliers_table.insert(record)
        except (OSError, ValueError):
            print(DB_WRITE_ERROR, file=sys.stderr)
            return 1

        inserted += 1

    print(f"Inserted {inserted} records.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
