"""Shared TrackFlow incident validation and analysis.

Used by scripts/analyze.py and services/api. Install editable with:
  pip install -e packages/incident_analysis
"""

from .core import (
    CARRIERS_BY_COUNTRY,
    CATEGORY_ORDER,
    COUNTRY_ORDER,
    REQUIRED_CSV_COLUMNS,
    RULE_CARRIER,
    RULE_CATEGORY,
    RULE_CLOSED_NO_SCORE,
    RULE_COUNTRY,
    RULE_DESCRIPTION,
    RULE_EMAIL,
    RULE_SCORE_RANGE,
    RULE_TRACKING,
    SCORE_LABELS,
    STATUS_ORDER,
    VALID_CATEGORIES,
    VALID_COUNTRIES,
    VALID_STATUSES,
    analyze,
    build_metric_rows,
    parse_satisfaction,
    results_csv_text,
    validate_row,
    write_results_csv,
)

__all__ = [
    "CARRIERS_BY_COUNTRY",
    "CATEGORY_ORDER",
    "COUNTRY_ORDER",
    "REQUIRED_CSV_COLUMNS",
    "RULE_CARRIER",
    "RULE_CATEGORY",
    "RULE_CLOSED_NO_SCORE",
    "RULE_COUNTRY",
    "RULE_DESCRIPTION",
    "RULE_EMAIL",
    "RULE_SCORE_RANGE",
    "RULE_TRACKING",
    "SCORE_LABELS",
    "STATUS_ORDER",
    "VALID_CATEGORIES",
    "VALID_COUNTRIES",
    "VALID_STATUSES",
    "analyze",
    "build_metric_rows",
    "parse_satisfaction",
    "results_csv_text",
    "validate_row",
    "write_results_csv",
]
