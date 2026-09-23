"""TinyDB persistence for the TrackFlow company API."""

from pathlib import Path

from tinydb import TinyDB

_DB_PATH = Path(__file__).resolve().parent.parent / "suppliers.json"

db = TinyDB(_DB_PATH)
suppliers_table = db.table("suppliers")
incidents_table = db.table("incidents")
users_table = db.table("users")
profiles_table = db.table("profiles")
password_reset_tokens_table = db.table("password_reset_tokens")
