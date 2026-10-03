import uuid
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import VideoCreate, VideoOut, PresignedUploadRequest
from db import get_connection, row_to_dict
from r2 import generate_upload_url
from deps import get_current_user_id

router = APIRouter()


@router.post("", response_model=VideoOut)
def create_video(
    payload: VideoCreate,
    r2_key: str | None = None,
    owner_id: str = Depends(get_current_user_id),
):
    video_id = str(uuid.uuid4())
    key = r2_key or f"videos/{video_id}"

    with get_connection() as conn:
        conn.execute(
            """INSERT INTO videos (id, owner_id, title, description, r2_key)
               VALUES (%s, %s, %s, %s, %s)""",
            (video_id, owner_id, payload.title, payload.description, key),
        )
        row = conn.execute("SELECT * FROM videos WHERE id = %s", (video_id,)).fetchone()

    return row_to_dict(row)


@router.get("", response_model=list[VideoOut])
def list_videos():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM videos ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: str):
    with get_connection() as conn:
        conn.execute("UPDATE videos SET views = views + 1 WHERE id = %s", (video_id,))
        row = conn.execute("SELECT * FROM videos WHERE id = %s", (video_id,)).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Video not found")
    return row_to_dict(row)


@router.delete("/{video_id}")
def delete_video(video_id: str, owner_id: str = Depends(get_current_user_id)):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT owner_id FROM videos WHERE id = %s", (video_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Video not found")
        if row["owner_id"] != owner_id:
            raise HTTPException(status_code=403, detail="Not your video")

        conn.execute("DELETE FROM videos WHERE id = %s", (video_id,))

    return {"deleted": True}


@router.post("/upload-url")
def get_presigned_upload_url(
    payload: PresignedUploadRequest,
    _owner_id: str = Depends(get_current_user_id),  # just enforces "must be logged in"
):
    key = f"videos/{uuid.uuid4()}-{payload.filename}"
    upload_url = generate_upload_url(key, payload.content_type)
    return {"upload_url": upload_url, "r2_key": key}
