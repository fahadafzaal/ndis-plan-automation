# ── Stage 1: Build the Next.js frontend ──────────────────────────────────────
FROM node:20-slim AS frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Empty API URL = same-origin (FastAPI serves both frontend and API)
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_MOCK=false
RUN npm run build
# Output lands in /frontend/out

# ── Stage 2: Python / FastAPI backend ────────────────────────────────────────
FROM python:3.11

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . /app

# Drop in the compiled Next.js static output
COPY --chown=user --from=frontend /frontend/out /app/static_next

RUN mkdir -p exports logs

ENV PORT=7860
ENV HOST=0.0.0.0

CMD ["python", "run.py"]
