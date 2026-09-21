"""TinyDB persistence for the TrackFlow supplier directory."""

import logging
from pathlib import Path

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
