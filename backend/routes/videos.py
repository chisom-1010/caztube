import uuid

from db import get_connection
from deps import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import PresignedUploadRequest, VideoCreate, VideoOut, VideoUpdate
from psycopg import sql
from r2 import generate_upload_url, public_url

router = APIRouter()

VIDEO_SELECT = """
    SELECT videos.*, users.username AS owner_username
    FROM videos
    JOIN users ON users.id = videos.owner_id
"""
VIDEO_BY_ID_QUERY = sql.SQL(VIDEO_SELECT + " WHERE videos.id = %s")
VIDEO_LIST_QUERY = sql.SQL(VIDEO_SELECT + " ORDER BY videos.created_at DESC")
VIDEO_NOT_FOUND = "Video not found"


def format_video(row) -> dict:
    data = dict(row)
    thumbnail_key = data.pop("thumbnail_key", None)
    data["thumbnail_url"] = public_url(thumbnail_key) if thumbnail_key else None
    return data


@router.post("", response_model=VideoOut)
def create_video(
    payload: VideoCreate,
    r2_key: str | None = None,
    thumbnail_key: str | None = None,
    owner_id: str = Depends(get_current_user_id),
):
    video_id = str(uuid.uuid4())
    key = r2_key or f"videos/{video_id}"

    with get_connection() as conn:
        conn.execute(
            """INSERT INTO videos (id, owner_id, title, description, r2_key, thumbnail_key)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                video_id,
                owner_id,
                payload.title,
                payload.description,
                key,
                thumbnail_key,
            ),
        )
        row = conn.execute(VIDEO_BY_ID_QUERY, (video_id,)).fetchone()

    return format_video(row)


@router.get("", response_model=list[VideoOut])
def list_videos():
    with get_connection() as conn:
        rows = conn.execute(VIDEO_LIST_QUERY).fetchall()
    return [format_video(r) for r in rows]


@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: str):
    with get_connection() as conn:
        conn.execute("UPDATE videos SET views = views + 1 WHERE id = %s", (video_id,))
        row = conn.execute(VIDEO_BY_ID_QUERY, (video_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=VIDEO_NOT_FOUND)
    return format_video(row)


@router.patch("/{video_id}", response_model=VideoOut)
def update_video(
    video_id: str,
    payload: VideoUpdate,
    owner_id: str = Depends(get_current_user_id),
):
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT owner_id FROM videos WHERE id = %s", (video_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=VIDEO_NOT_FOUND)
        if existing["owner_id"] != owner_id:
            raise HTTPException(status_code=403, detail="Not your video")

        updates = {}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.description is not None:
            updates["description"] = payload.description

        if not updates:
            raise HTTPException(status_code=400, detail="Nothing to update")

        update_parts = [
            sql.SQL("{column} = %s").format(column=sql.Identifier(column))
            for column in updates
        ]
        query = sql.SQL("UPDATE videos SET {fields} WHERE id = %s").format(
            fields=sql.SQL(", ").join(update_parts),
        )
        conn.execute(query, (*updates.values(), video_id))

        row = conn.execute(VIDEO_BY_ID_QUERY, (video_id,)).fetchone()

    return format_video(row)


@router.delete("/{video_id}")
def delete_video(video_id: str, owner_id: str = Depends(get_current_user_id)):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT owner_id FROM videos WHERE id = %s", (video_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=VIDEO_NOT_FOUND)
        if row["owner_id"] != owner_id:
            raise HTTPException(status_code=403, detail="Not your video")

        conn.execute("DELETE FROM videos WHERE id = %s", (video_id,))

    return {"deleted": True}


@router.post("/upload-url")
def get_presigned_upload_url(
    payload: PresignedUploadRequest,
    _owner_id: str = Depends(get_current_user_id),
):
    key = f"videos/{uuid.uuid4()}-{payload.filename}"
    upload_url = generate_upload_url(key, payload.content_type)
    return {"upload_url": upload_url, "r2_key": key}
