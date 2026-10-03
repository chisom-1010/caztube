"""Pydantic models — request/response shapes for the caZTube API."""

from datetime import datetime
from pydantic import BaseModel, EmailStr


# --- Users ---

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: str | None = None


class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    created_at: datetime


# --- Videos ---

class VideoCreate(BaseModel):
    title: str
    description: str | None = None


class VideoOut(BaseModel):
    id: str
    owner_id: str
    title: str
    description: str | None
    r2_key: str
    duration_seconds: int | None
    file_size_bytes: int | None
    status: str
    views: int
    created_at: datetime


class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str
