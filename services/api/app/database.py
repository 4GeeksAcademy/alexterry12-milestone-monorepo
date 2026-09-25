"""TinyDB persistence for the TrackFlow company API."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlmodel import Session, create_engine
from tinydb import TinyDB

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).resolve().parent.parent / "suppliers.json"

try:
    db = TinyDB(_DB_PATH)
except (OSError, ValueError) as exc:
    # The path belongs in the log, never in an error that could reach a client.
    logger.exception("Could not open the TinyDB store at %s", _DB_PATH)
    raise RuntimeError("The incident database could not be opened.") from exc

suppliers_table = db.table("suppliers")
incidents_table = db.table("incidents")
users_table = db.table("users")
profiles_table = db.table("profiles")
password_reset_tokens_table = db.table("password_reset_tokens")

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

_database_url = os.environ.get("DATABASE_URL")
if not _database_url:
    raise RuntimeError("DATABASE_URL is not set.")

engine = create_engine(_database_url, pool_pre_ping=True)


def get_db():
    """Yield a request-scoped SQLModel session and close it afterwards."""
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()
