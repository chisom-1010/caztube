import uuid

import psycopg
from fastapi import APIRouter, HTTPException

from models.schemas import UserCreate, UserLogin, UserOut
from db import get_connection, row_to_dict
from auth_utils import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate):
    user_id = str(uuid.uuid4())
    password_hash = hash_password(payload.password)

    with get_connection() as conn:
        try:
            conn.execute(
                "INSERT INTO users (id, username, email, password_hash) VALUES (%s, %s, %s, %s)",
                (user_id, payload.username, payload.email, password_hash),
            )
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=400, detail="Username or email already taken"
            )

        row = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()

    return row_to_dict(row)


@router.post("/login")
def login(payload: UserLogin):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = %s", (payload.email,)
        ).fetchone()

    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(row["id"])
    return {"access_token": token, "token_type": "bearer"}
