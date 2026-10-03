# caZTube backend — InstaCloud deploy
FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

# Install deps first so this layer caches between deploys
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Then the rest of the app
COPY . .

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

# Adjust "src.main:app" if your entrypoint module/object is named differently
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
