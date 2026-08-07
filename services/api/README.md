# TrackFlow Company API (`services/api`)

## Objective

Centralized FastAPI backend for TrackFlow. Phase 2 exposes incident-report
analysis for Valentina Cruz's CX team: upload a monthly incidents CSV, get
aggregate metrics, and download a one-row-per-metric results file — without
ever exposing `customer_email`.

Validation and analysis are **not** reimplemented here. They come from the
shared package `incident_analysis` (`packages/incident_analysis/`), the same
logic used by `scripts/analyze.py`.

## Technology

- Python 3.10+
- FastAPI + Uvicorn
- `python-multipart` (CSV upload)
- Shared package: `incident-analysis` (editable install)

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/incidents/analyze` | Multipart field `file` — CSV upload; returns JSON summary |
| `GET` | `/api/incidents/results/export` | Download last analysis as `results.csv` |
| `GET` | `/health` | Liveness check |
| `GET` | `/docs` | OpenAPI UI |

Last analysis is kept **in memory** (single uvicorn worker). Restarting the
process clears it. Multiple workers would not share state.

## How to run

From the **repository root**:

```bash
# 1. Shared analysis package (required — no sys.path hacks in the API)
pip install -e packages/incident_analysis

# 2. API dependencies
pip install -r services/api/requirements.txt

# 3. Start the server (working directory = services/api)
cd services/api
# Backoffice expects the API on port 8001 by default (see uis/backoffice/.env.example)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 \
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### CORS

The backoffice runs in the browser on a different origin (e.g. `:3000`) than
this API. `CORSMiddleware` allows origins listed in `CORS_ORIGINS`
(comma-separated). Default: `http://localhost:3000,http://127.0.0.1:3000`.

### Example requests

```bash
# Analyze the TrackFlow sample CSV
curl -s -X POST "http://localhost:8001/api/incidents/analyze" \
  -F "file=@../../scripts/incidents-trackflow.csv;type=text/csv"

# Export last results (same metric,value format as the CLI results.csv)
curl -s -o results.csv "http://localhost:8001/api/incidents/results/export"
```


Expected aggregates for `scripts/incidents-trackflow.csv`: 100 total, 95 valid,
5 invalid, average satisfaction 3.06.

## Privacy

Responses and exports contain aggregates only. `customer_email` is never
returned, logged, or written to export CSV.
