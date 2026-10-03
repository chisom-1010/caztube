"""Stream routes — resolve a video id to its playable R2 URL."""

from fastapi import APIRouter, HTTPException

from db import get_connection
from r2 import public_url

router = APIRouter()


@router.get("/{video_id}")
def get_stream_url(video_id: str):
    with get_connection() as conn:
        row = conn.execute("SELECT r2_key FROM videos WHERE id = ?", (video_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Video not found")

    return {"stream_url": public_url(row["r2_key"])}
