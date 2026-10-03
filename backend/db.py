import os
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

# InstaCloud injects this automatically once you run:
#   insta secrets bind DATABASE_URL postgres/db --to compute/app
DATABASE_URL = os.environ["DATABASE_URL"]


@contextmanager
def get_connection():
    """Yields a psycopg connection whose rows behave like dicts,
    mirroring the old sqlite3.Row + row_factory setup."""
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)
    try:
        yield conn
    finally:
        conn.close()


def row_to_dict(row):
    return dict(row) if row is not None else None


def init_db():
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r") as f:
        schema = f.read()
    with get_connection() as conn:
        # multiple ';'-separated statements, no params -> simple query protocol handles this fine
        conn.execute(schema)
