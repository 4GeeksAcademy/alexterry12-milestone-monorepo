"""Seed TinyDB incidents from scripts/incidents-trackflow.csv.

Run from the repository root:
  services/api/.venv/bin/python scripts/seed_incidents.py
"""

from __future__ import annotations

import csv
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_API_ROOT = _REPO_ROOT / "services" / "api"
_SHARED_ROOT = _REPO_ROOT / "packages" / "shared"

for _path in (_API_ROOT, _SHARED_ROOT):
    path_str = str(_path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

from tinydb import Query  # noqa: E402

from app.database import incidents_table  # noqa: E402
from app.models import Incident  # noqa: E402
from incident_rules import (  # noqa: E402
    CSV_BRANCH_MAP,
    CSV_CATEGORY_MAP,
    CSV_STATUS_MAP,
    validate_row,
)

CSV_PATH = _REPO_ROOT / "scripts" / "incidents-trackflow.csv"

UNMAPPED_STATUS = "Unmapped CSV status"
UNMAPPED_CATEGORY = "Unmapped CSV category"
UNMAPPED_COUNTRY = "Unmapped CSV country"
EMPTY_TITLE = "Empty title after trim"


def _midnight_utc_iso(date_str: str) -> str:
    """Parse YYYY-MM-DD as midnight UTC and return an ISO string."""
    day = datetime.strptime(date_str.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return day.isoformat()


def main() -> None:
    inserted = 0
    skipped_duplicate = 0
    skipped_invalid = 0
    rule_counts: Counter[str] = Counter()
    existing = Query()

    with CSV_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            broken = validate_row(row)
            if broken:
                skipped_invalid += 1
                for rule in broken:
                    rule_counts[rule] += 1
                continue

            csv_status = (row.get("status") or "").strip()
            csv_category = (row.get("category") or "").strip()
            csv_country = (row.get("country") or "").strip()
            csv_description = row.get("description") or ""

            status = CSV_STATUS_MAP.get(csv_status)
            category = CSV_CATEGORY_MAP.get(csv_category)
            branch = CSV_BRANCH_MAP.get(csv_country)

            if status is None:
                skipped_invalid += 1
                rule_counts[UNMAPPED_STATUS] += 1
                continue
            if category is None:
                skipped_invalid += 1
                rule_counts[UNMAPPED_CATEGORY] += 1
                continue
            if branch is None:
                skipped_invalid += 1
                rule_counts[UNMAPPED_COUNTRY] += 1
                continue

            title = csv_description.strip()[:120]
            if not title:
                skipped_invalid += 1
                rule_counts[EMPTY_TITLE] += 1
                continue

            source_incident_id = (row.get("incident_id") or "").strip()
            created_at = _midnight_utc_iso(row["date"])
            updated_at = created_at

            if source_incident_id and incidents_table.search(
                existing.source_incident_id == source_incident_id
            ):
                skipped_duplicate += 1
                continue

            record = {
                "title": title,
                "description": csv_description,
                "category": category,
                "origin": "customer",
                "branch": branch,
                "status": status,
                "created_at": created_at,
                "updated_at": updated_at,
            }
            # Validate shape against the Incident model before insert.
            Incident.model_validate(record)
            # Bookkeeping only — not part of Incident / API responses.
            record["source_incident_id"] = source_incident_id
            incidents_table.insert(record)
            inserted += 1

    print(f"Inserted: {inserted}")
    print(f"Skipped (duplicate): {skipped_duplicate}")
    print(f"Skipped (invalid): {skipped_invalid}")
    print()
    print("Validation / skip rule breakdown:")
    if rule_counts:
        for rule, count in sorted(rule_counts.items(), key=lambda item: (-item[1], item[0])):
            print(f"  {rule}: {count}")
    else:
        print("  (none)")

    status_totals: Counter[str] = Counter()
    category_totals: Counter[str] = Counter()
    for doc in incidents_table.all():
        status_totals[str(doc.get("status", ""))] += 1
        category_totals[str(doc.get("category", ""))] += 1

    print()
    print("Totals by status (incidents_table):")
    for status, count in sorted(status_totals.items()):
        print(f"  {status}: {count}")

    print()
    print("Totals by category (incidents_table):")
    for category, count in sorted(category_totals.items()):
        print(f"  {category}: {count}")


if __name__ == "__main__":
    main()
