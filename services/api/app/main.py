"""TrackFlow centralized company API — incident analysis (Phase 2)."""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import auth, incident_manager, incidents, profiles, suppliers, users

logger = logging.getLogger(__name__)

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

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(incident_manager.router)
app.include_router(profiles.router)
app.include_router(suppliers.router)
app.include_router(users.router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> Response:
    """Record the real error server-side; send the client a generic body."""
    # Expected outcomes: hand them back to FastAPI's own handlers unchanged.
    if isinstance(exc, StarletteHTTPException):
        return await http_exception_handler(request, exc)
    if isinstance(exc, RequestValidationError):
        return await request_validation_exception_handler(request, exc)

    # Path only — a query string can carry request data.
    logger.exception(
        "Unhandled error while handling %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred."},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
