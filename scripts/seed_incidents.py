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

from pydantic import ValidationError  # noqa: E402
from tinydb import Query  # noqa: E402

from app.schemas import Incident  # noqa: E402
from incident_analysis import REQUIRED_CSV_COLUMNS  # noqa: E402
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
INVALID_DATE = "Missing or unparsable date"
MODEL_INVALID = "Failed Incident model validation"

DB_READ_ERROR = (
    "Error: could not read the incident database. Check that "
    "services/api/suppliers.json exists and contains valid JSON."
)
DB_WRITE_ERROR = (
    "Error: could not write to the incident database. Check that "
    "services/api/suppliers.json is writable and contains valid JSON."
)


def _midnight_utc_iso(date_str: str) -> str:
    """Parse YYYY-MM-DD as midnight UTC and return an ISO string."""
    day = datetime.strptime(date_str.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return day.isoformat()


def _csv_display_path() -> str:
    """Repo-relative path for messages — never an absolute filesystem path."""
    try:
        return str(CSV_PATH.relative_to(_REPO_ROOT))
    except ValueError:
        return CSV_PATH.name


def _csv_problem() -> str | None:
    """Check the CSV is readable and has the expected header. None means usable."""
    shown = _csv_display_path()
    try:
        with CSV_PATH.open(newline="", encoding="utf-8") as handle:
            header = next(csv.reader(handle), None)
    except FileNotFoundError:
        return f"Error: file not found: {shown}. Check that the export is in place."
    except PermissionError:
        return (
            f"Error: cannot read {shown}: permission denied. "
            "Check the file permissions."
        )
    except UnicodeDecodeError:
        return f"Error: {shown} is not valid UTF-8 text. Re-export the CSV as UTF-8."
    except csv.Error:
        return f"Error: could not parse {shown} as CSV. Check the file format."
    except OSError:
        return f"Error: could not read {shown}. Check that the file is accessible."

    if header is None:
        return f"Error: {shown} is empty. There is nothing to seed."

    present = {name.strip() for name in header if name is not None}
    missing = REQUIRED_CSV_COLUMNS - present
    if missing:
        return (
            f"Error: {shown} is missing required columns: "
            + ", ".join(sorted(missing))
            + ". Check that this is the incidents export."
        )
    return None


def main() -> int:
    # Imported here rather than at module scope so a store that cannot be opened
    # is reported as a message instead of an import-time traceback.
    try:
        from app.database import incidents_table
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError):
        print(DB_READ_ERROR, file=sys.stderr)
        return 1

    problem = _csv_problem()
    if problem is not None:
        print(problem, file=sys.stderr)
        return 1

    inserted = 0
    skipped_duplicate = 0
    skipped_invalid = 0
    rule_counts: Counter[str] = Counter()
    existing = Query()
    shown = _csv_display_path()

    try:
        with CSV_PATH.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                line = reader.line_num
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
                try:
                    created_at = _midnight_utc_iso(row["date"])
                except (KeyError, TypeError, ValueError):
                    skipped_invalid += 1
                    rule_counts[INVALID_DATE] += 1
                    print(
                        f"Warning: row {line}: missing or unparsable date "
                        "(expected YYYY-MM-DD) — skipped.",
                        file=sys.stderr,
                    )
                    continue
                updated_at = created_at

                try:
                    duplicate = bool(source_incident_id) and bool(
                        incidents_table.search(
                            existing.source_incident_id == source_incident_id
                        )
                    )
                except (OSError, ValueError):
                    print(DB_READ_ERROR, file=sys.stderr)
                    return 1

                if duplicate:
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
                try:
                    Incident.model_validate(record)
                except ValidationError:
                    skipped_invalid += 1
                    rule_counts[MODEL_INVALID] += 1
                    print(
                        f"Warning: row {line}: does not match the Incident model "
                        "— skipped.",
                        file=sys.stderr,
                    )
                    continue

                # Bookkeeping only — not part of Incident / API responses.
                record["source_incident_id"] = source_incident_id
                try:
                    incidents_table.insert(record)
                except (OSError, ValueError):
                    print(DB_WRITE_ERROR, file=sys.stderr)
                    return 1

                inserted += 1
    except (csv.Error, UnicodeDecodeError):
        print(
            f"Error: could not read {shown} as CSV — stopped part way through. "
            "Check the file format, then run again.",
            file=sys.stderr,
        )
        return 1
    except (FileNotFoundError, PermissionError, OSError):
        print(
            f"Error: could not read {shown} — stopped part way through. "
            "Check that the file is accessible, then run again.",
            file=sys.stderr,
        )
        return 1

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

    try:
        docs = incidents_table.all()
    except (OSError, ValueError):
        print(DB_READ_ERROR, file=sys.stderr)
        return 1

    status_totals: Counter[str] = Counter()
    category_totals: Counter[str] = Counter()
    for doc in docs:
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

    return 0


if __name__ == "__main__":
    sys.exit(main())
