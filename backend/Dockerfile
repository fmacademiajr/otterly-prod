# Otterly backend — FastAPI + motor, served by uvicorn.
# Build context is the repo root (see fly.toml `dockerfile`), so paths are backend/*.
FROM python:3.11-slim

# build-essential + libffi-dev cover the C-extension builds in requirements.txt
# (cryptography, cffi, etc.). Most others ship manylinux wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so this layer caches across code changes.
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# App code. .dockerignore keeps .venv / __pycache__ / tests out of the image.
COPY backend/ /app/

EXPOSE 8080
# server:app = the FastAPI instance in server.py. Env (MONGO_URL, ANTHROPIC_API_KEY,
# OPENAI_API_KEY, DB_NAME, ...) is injected by the host as secrets, not baked in.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
