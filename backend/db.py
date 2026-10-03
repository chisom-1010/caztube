import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg import Connection
from psycopg.rows import dict_row

load_dotenv()

database_url = os.environ["DATABASE_URL"]
DATABASE_URL = database_url


@contextmanager
def get_connection() -> Iterator[Connection[Any]]:
    row_factory: Any = dict_row
    conn = psycopg.connect(DATABASE_URL, row_factory=row_factory, autocommit=True)
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
        conn.execute(schema)  # type: ignore[reportArgumentType]
