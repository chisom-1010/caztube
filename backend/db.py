"""
Local database access — SQLite for local dev (same engine as D1).

When deployed to Cloudflare Python Workers, swap this module's functions
to use the D1 binding (env.DB) instead. The SQL itself barely changes —
only how the connection/query is made.
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "local.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"
# db.py lives at backend/ root, alongside schema.sql and r2.py


def init_db():
    """Create tables if they don't exist yet. Call this once at startup."""
    with get_connection() as conn:
        conn.executescript(SCHEMA_PATH.read_text())


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name, like a dict
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)
