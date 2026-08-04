#!/usr/bin/env python3
"""TrackFlow incident CSV analyzer — CLI wrapper around shared analysis logic."""

from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/analyze.py` without a prior pip install by putting
# packages/ on sys.path. Prefer: pip install -e packages/incident_analysis
# (required for services/api — do not rely on this bootstrap there).
_PACKAGES_DIR = Path(__file__).resolve().parent.parent / "packages"
if str(_PACKAGES_DIR) not in sys.path:
    sys.path.insert(0, str(_PACKAGES_DIR))

from incident_analysis import (  # noqa: E402
    CATEGORY_ORDER,
    COUNTRY_ORDER,
    RULE_CARRIER,
    RULE_CATEGORY,
    RULE_CLOSED_NO_SCORE,
    RULE_EMAIL,
    RULE_TRACKING,
    SCORE_LABELS,
    STATUS_ORDER,
    analyze,
    write_results_csv,
)


def pct(part: int, whole: int) -> str:
    if whole == 0:
        return "0.0%"
    return f"{(part / whole) * 100:.1f}%"


def print_summary(data: dict) -> None:
    v = data["valid"]
    rules = data["rule_counts"]
    cats = data["category_counts"]
    statuses = data["status_counts"]
    countries = data["country_counts"]
    scores = data["score_counts"]

    print("=" * 60)
    print("  TRACKFLOW — INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {data['source']}")
    print("=" * 60)
    print()
    print(f"TOTAL RECORDS IN FILE .......... {data['total']}")
    print(f"  ├─ Valid records ................ {data['valid']}")
    print(f"  └─ Invalid / incomplete .......... {data['invalid']}")
    print()
    print("INVALID RECORDS BREAKDOWN")
    print(f"  ├─ Invalid tracking number ....... {rules.get(RULE_TRACKING, 0)}")
    print(f"  ├─ Carrier/country mismatch ...... {rules.get(RULE_CARRIER, 0)}")
    print(f"  ├─ Invalid or missing category ... {rules.get(RULE_CATEGORY, 0)}")
    print(f"  ├─ Invalid or missing email ...... {rules.get(RULE_EMAIL, 0)}")
    print(f"  └─ Closed incident, no score ..... {rules.get(RULE_CLOSED_NO_SCORE, 0)}")
    print()
    print("BREAKDOWN BY CATEGORY (valid records)")
    for i, cat in enumerate(CATEGORY_ORDER):
        count = cats.get(cat, 0)
        branch = "└─" if i == len(CATEGORY_ORDER) - 1 else "├─"
        dots = "." * max(1, 26 - len(cat))
        # DAMAGE line uses slightly wider spacing to mirror expected sample
        gap = "   " if cat == "DAMAGE" else "  "
        print(f"  {branch} {cat} {dots} {count}{gap}({pct(count, v)})")
    print()
    print("BREAKDOWN BY STATUS (valid records)")
    for i, status in enumerate(STATUS_ORDER):
        count = statuses.get(status, 0)
        branch = "└─" if i == len(STATUS_ORDER) - 1 else "├─"
        dots = "." * max(1, 26 - len(status))
        print(f"  {branch} {status} {dots} {count}  ({pct(count, v)})")
    print()
    print("BREAKDOWN BY COUNTRY (valid records) — recommended, not required")
    for i, country in enumerate(COUNTRY_ORDER):
        count = countries.get(country, 0)
        branch = "└─" if i == len(COUNTRY_ORDER) - 1 else "├─"
        dots = "." * max(1, 26 - len(country))
        print(f"  {branch} {country} {dots} {count}  ({pct(count, v)})")
    print()
    print("SATISFACTION INDEX (closed incidents)")
    print(f"  Scored incidents: {data['closed_scored']} of {data['closed_total']}")
    print(f"  Average score: {data['average']:.2f} / 5.00")
    for score in range(1, 6):
        branch = "└─" if score == 5 else "├─"
        label = SCORE_LABELS[score]
        count = scores.get(score, 0)
        # Slightly tighter spacing on score 2 line matches sample spirit
        print(f"  {branch} Score {score} ({label}) {'.' * max(1, 18 - len(label))} {count}")
    print()
    print("=" * 60)


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python analyze.py <path-to-incidents.csv>", file=sys.stderr)
        return 1

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"Error: file not found: {path}", file=sys.stderr)
        return 1

    data = analyze(path)
    print_summary(data)

    answer = input("Export results to CSV? [y / n]: ").strip().lower()
    if answer == "y":
        out = Path("results.csv")
        write_results_csv(data, out)
        print(f"Wrote {out.resolve()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
