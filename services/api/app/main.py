"""TrackFlow centralized company API — incident analysis (Phase 2)."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import incidents, suppliers

app = FastAPI(
    title="TrackFlow Company API",
    description=(
        "Centralized FastAPI backend for TrackFlow — incident analysis "
        "and supplier directory."
    ),
    version="0.1.0",
)

# Browser frontends (e.g. uis/backoffice on :3000) call this API on another
# origin — enable an explicit allow-list via CORS_ORIGINS (comma-separated).
_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)
app.include_router(suppliers.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
