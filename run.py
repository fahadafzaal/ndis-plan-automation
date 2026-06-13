"""Launcher for the NDIS Plan Automation MVP dashboard.

Usage:
    python run.py            # serves http://127.0.0.1:8000
"""
from __future__ import annotations

import os

import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    if not (os.getenv("OPENCODE_API_KEY") or os.getenv("NDIS_API_KEY")):
        print(
            "WARNING: no API key set. Copy .env.example to .env and add OPENCODE_API_KEY "
            "(or NDIS_API_KEY), or the Parse/Generate steps will fail.\n"
        )
    host = os.getenv("HOST", "127.0.0.1")   # Render sets HOST=0.0.0.0 via PORT/HOST
    port = int(os.getenv("PORT", "8000"))   # Render injects PORT
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=bool(os.getenv("NDIS_RELOAD")),
    )
