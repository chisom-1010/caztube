from fastapi import APIRouter, HTTPException, Depends

from models.schemas import UserOut, UserUpdate
from db import get_connection, row_to_dict
from deps import get_current_user_id

router = APIRouter()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_dict(row)


@router.patch("/me", response_model=UserOut)
def update_my_profile(payload: UserUpdate, user_id: str = Depends(get_current_user_id)):
    if payload.username is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    with get_connection() as conn:
        try:
            conn.execute(
                "UPDATE users SET username = %s WHERE id = %s",
                (payload.username, user_id),
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Username already taken")

        row = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()

    return row_to_dict(row)