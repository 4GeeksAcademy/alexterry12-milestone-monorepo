"""TinyDB persistence for the TrackFlow company API."""

from pathlib import Path

from tinydb import TinyDB

_DB_PATH = Path(__file__).resolve().parent.parent / "suppliers.json"

db = TinyDB(_DB_PATH)
suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")
