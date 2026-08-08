"""TinyDB persistence for the TrackFlow supplier directory."""

from pathlib import Path

from tinydb import TinyDB

_DB_PATH = Path(__file__).resolve().parent.parent / "suppliers.json"

db = TinyDB(_DB_PATH)
suppliers_table = db.table("suppliers")
