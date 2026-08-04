"""Incident CSV validation rules and analyze() — no I/O beyond reading the CSV."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

VALID_COUNTRIES = {"US", "ES"}
CARRIERS_BY_COUNTRY = {
    "US": {"UPS", "FEDEX", "DHL_US"},
    "ES": {"MRW", "SEUR", "DHL_ES", "LOCAL_ES"},
}
VALID_CATEGORIES = {
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
}
VALID_STATUSES = {"OPEN", "CLOSED", "DISCARDED"}

# Keys used for invalid-rule counters (match CONTEXT reporting labels)
RULE_COUNTRY = "Missing or invalid country"
RULE_CARRIER = "Carrier not valid for declared country"
RULE_TRACKING = "Missing or invalid tracking_number"
RULE_CATEGORY = "Missing or invalid category"
RULE_DESCRIPTION = "Empty description"
RULE_EMAIL = "Missing or invalid customer_email"
RULE_CLOSED_NO_SCORE = "status = CLOSED with no satisfaction_score"
RULE_SCORE_RANGE = "satisfaction_score out of range"

CATEGORY_ORDER = [
    "LOST_PARCEL",
    "DELAYED_DELIVERY",
    "WRONG_ADDRESS",
    "RETURN_REQUEST",
    "DAMAGE",
]
STATUS_ORDER = ["OPEN", "CLOSED", "DISCARDED"]
COUNTRY_ORDER = ["US", "ES"]
SCORE_LABELS = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}


def _blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def parse_satisfaction(raw: str | None) -> int | None:
    """Return int score, or None if blank. Raises ValueError if non-integer text."""
    if _blank(raw):
        return None
    return int(str(raw).strip())


def validate_row(row: dict[str, str]) -> list[str]:
    """Return every rule name this row breaks (multi-rule counting)."""
    broken: list[str] = []

    country = (row.get("country") or "").strip()
    if country not in VALID_COUNTRIES:
        broken.append(RULE_COUNTRY)

    carrier = (row.get("carrier") or "").strip()
    valid_carriers = CARRIERS_BY_COUNTRY.get(country, set())
    if _blank(carrier) or carrier not in valid_carriers:
        broken.append(RULE_CARRIER)

    tracking = (row.get("tracking_number") or "").strip()
    if len(tracking) < 8:
        broken.append(RULE_TRACKING)

    category = (row.get("category") or "").strip()
    if category not in VALID_CATEGORIES:
        broken.append(RULE_CATEGORY)

    description = (row.get("description") or "").strip()
    if len(description) < 5:
        broken.append(RULE_DESCRIPTION)

    email = (row.get("customer_email") or "").strip()
    if _blank(email) or "@" not in email:
        broken.append(RULE_EMAIL)

    status = (row.get("status") or "").strip()
    score_raw = row.get("satisfaction_score")
    try:
        score = parse_satisfaction(score_raw)
        score_parse_ok = True
    except ValueError:
        score = None
        score_parse_ok = False

    if status == "CLOSED" and score is None:
        # Blank or non-integer both mean "no valid score" for CLOSED
        broken.append(RULE_CLOSED_NO_SCORE)

    if not _blank(score_raw):
        if not score_parse_ok or score is None or score < 1 or score > 5:
            broken.append(RULE_SCORE_RANGE)

    return broken


def analyze(path: Path) -> dict:
    rule_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    country_counts: Counter[str] = Counter()
    score_counts: Counter[int] = Counter()
    valid = 0
    invalid = 0
    total = 0

    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            total += 1
            # Never retain or print customer_email beyond validation
            broken = validate_row(row)
            if broken:
                invalid += 1
                for rule in broken:
                    rule_counts[rule] += 1
                continue

            valid += 1
            category_counts[row["category"].strip()] += 1
            status_counts[row["status"].strip()] += 1
            country_counts[row["country"].strip()] += 1

            if row["status"].strip() == "CLOSED":
                score = parse_satisfaction(row.get("satisfaction_score"))
                if score is not None:
                    score_counts[score] += 1

    closed_scored = sum(score_counts.values())
    score_sum = sum(s * n for s, n in score_counts.items())
    average = round(score_sum / closed_scored, 2) if closed_scored else 0.0

    return {
        "source": path.name,
        "total": total,
        "valid": valid,
        "invalid": invalid,
        "rule_counts": rule_counts,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "country_counts": country_counts,
        "score_counts": score_counts,
        "closed_scored": closed_scored,
        "closed_total": status_counts.get("CLOSED", 0),
        "average": average,
    }


REQUIRED_CSV_COLUMNS = {
    "incident_id",
    "date",
    "country",
    "customer_type",
    "tracking_number",
    "carrier",
    "category",
    "description",
    "status",
    "customer_email",
    "satisfaction_score",
}


def build_metric_rows(data: dict) -> list[tuple[str, str | int | float]]:
    """One row per metric for results.csv. Never includes customer_email."""
    rows: list[tuple[str, str | int | float]] = [
        ("total_records", data["total"]),
        ("valid_records", data["valid"]),
        ("invalid_records", data["invalid"]),
        ("invalid_tracking_number", data["rule_counts"].get(RULE_TRACKING, 0)),
        ("invalid_carrier_country_mismatch", data["rule_counts"].get(RULE_CARRIER, 0)),
        ("invalid_category", data["rule_counts"].get(RULE_CATEGORY, 0)),
        ("invalid_email", data["rule_counts"].get(RULE_EMAIL, 0)),
        ("invalid_closed_no_score", data["rule_counts"].get(RULE_CLOSED_NO_SCORE, 0)),
        ("invalid_country", data["rule_counts"].get(RULE_COUNTRY, 0)),
        ("invalid_description", data["rule_counts"].get(RULE_DESCRIPTION, 0)),
        ("invalid_score_out_of_range", data["rule_counts"].get(RULE_SCORE_RANGE, 0)),
    ]
    for cat in CATEGORY_ORDER:
        rows.append((f"category_{cat}", data["category_counts"].get(cat, 0)))
    for status in STATUS_ORDER:
        rows.append((f"status_{status}", data["status_counts"].get(status, 0)))
    for country in COUNTRY_ORDER:
        rows.append((f"country_{country}", data["country_counts"].get(country, 0)))
    rows.append(("satisfaction_average", f"{data['average']:.2f}"))
    rows.append(("satisfaction_scored_count", data["closed_scored"]))
    for score in range(1, 6):
        rows.append((f"satisfaction_score_{score}", data["score_counts"].get(score, 0)))
    return rows


def write_results_csv(data: dict, out_path: Path) -> None:
    """Write metric,value CSV. Never includes customer_email."""
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["metric", "value"])
        writer.writerows(build_metric_rows(data))


def results_csv_text(data: dict) -> str:
    """Return results.csv contents as a string (for API download)."""
    from io import StringIO

    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["metric", "value"])
    writer.writerows(build_metric_rows(data))
    return buf.getvalue()
