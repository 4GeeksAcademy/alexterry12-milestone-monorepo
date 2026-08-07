"""Incident analysis endpoints — uses shared incident_analysis package."""

from __future__ import annotations

import csv
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from incident_analysis import (
    REQUIRED_CSV_COLUMNS,
    RULE_CARRIER,
    RULE_CATEGORY,
    RULE_CLOSED_NO_SCORE,
    RULE_COUNTRY,
    RULE_DESCRIPTION,
    RULE_EMAIL,
    RULE_SCORE_RANGE,
    RULE_TRACKING,
    analyze,
    results_csv_text,
)

from app import state

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _looks_like_csv(filename: str | None, content_type: str | None) -> bool:
    name = (filename or "").lower()
    if name.endswith(".csv"):
        return True
    if content_type:
        ct = content_type.split(";")[0].strip().lower()
        if ct in {"text/csv", "application/csv", "application/vnd.ms-excel"}:
            return True
    return False


def _validate_headers(path: Path) -> None:
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None:
            raise HTTPException(
                status_code=400,
                detail="Malformed CSV: missing header row.",
            )
        headers = {h.strip() for h in reader.fieldnames if h is not None}
        missing = REQUIRED_CSV_COLUMNS - headers
        if missing:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Malformed CSV: missing required columns: "
                    + ", ".join(sorted(missing))
                ),
            )


def _summary_payload(data: dict) -> dict:
    """JSON-safe aggregates only — never includes customer_email or row data."""
    rules = data["rule_counts"]
    return {
        "source": data["source"],
        "total_records": data["total"],
        "valid_records": data["valid"],
        "invalid_records": data["invalid"],
        "invalid_breakdown": {
            "invalid_tracking_number": rules.get(RULE_TRACKING, 0),
            "carrier_country_mismatch": rules.get(RULE_CARRIER, 0),
            "invalid_category": rules.get(RULE_CATEGORY, 0),
            "invalid_email": rules.get(RULE_EMAIL, 0),
            "closed_no_score": rules.get(RULE_CLOSED_NO_SCORE, 0),
            "invalid_country": rules.get(RULE_COUNTRY, 0),
            "empty_description": rules.get(RULE_DESCRIPTION, 0),
            "score_out_of_range": rules.get(RULE_SCORE_RANGE, 0),
        },
        "by_category": dict(data["category_counts"]),
        "by_status": dict(data["status_counts"]),
        "by_country": dict(data["country_counts"]),
        "satisfaction": {
            "scored_incidents": data["closed_scored"],
            "closed_total": data["closed_total"],
            "average": data["average"],
            "score_counts": {str(k): v for k, v in sorted(data["score_counts"].items())},
        },
    }


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    """Accept a CSV upload, run shared analyze(), store result for export."""
    if not _looks_like_csv(file.filename, file.content_type):
        raise HTTPException(
            status_code=400,
            detail="Not a CSV file. Upload a .csv file (multipart field name: file).",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file. Upload a non-empty CSV.")

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=".csv",
            delete=False,
        ) as tmp:
            tmp.write(raw)
            tmp_path = Path(tmp.name)

        try:
            _validate_headers(tmp_path)
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail="Malformed file: could not decode as UTF-8 CSV.",
            ) from exc
        except csv.Error as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Malformed CSV: {exc}",
            ) from exc

        try:
            data = analyze(tmp_path)
        except csv.Error as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Malformed CSV while reading records: {exc}",
            ) from exc
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail="Malformed file: could not decode as UTF-8 CSV.",
            ) from exc

        # Use the client filename in the summary, not the temp path name
        data["source"] = Path(file.filename or "upload.csv").name
        state.set_last_result(data)
        return _summary_payload(data)
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)


@router.get("/results/export")
def export_results() -> Response:
    """Download the last analysis as metric,value CSV (same format as results.csv)."""
    data = state.get_last_result()
    if data is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis available. POST /api/incidents/analyze first.",
        )

    body = results_csv_text(data)
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="results.csv"',
        },
    )
