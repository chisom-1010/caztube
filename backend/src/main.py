"""
caZTube backend — FastAPI app, deployed as a Cloudflare Python Worker.

Local dev:
    uv run uvicorn src.main:app --reload

Deploy (once wrangler.toml is configured):
    wrangler deploy
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import auth, users, videos, stream
from db import init_db

app = FastAPI(title="caZTube API", version="0.1.0")

# Adjust allow_origins to your Vercel frontend URL(s) before deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://caztube.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(videos.router, prefix="/videos", tags=["videos"])
app.include_router(stream.router, prefix="/stream", tags=["stream"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def health_check():
    return {"status": "ok", "service": "caZTube API"}
