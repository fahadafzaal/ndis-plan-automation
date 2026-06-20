"""FastAPI app: the dashboard backend wiring the pipeline together.

Flow: /api/parse -> /api/decisions -> /api/generate -> /api/export.
"""
from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .agents.intake_parser import parse_intake
from .agents.plan_generator import generate_plan
from .checkpoints import all_confirmed, apply_decisions, build_checkpoints
from .exporter import EXPORT_DIR, export_documents
from .models import Decision
from .renderer import render_care_plan, render_progress_notes, render_risk_consent
from .storage import create_session, get_session
from .validator import validate

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
FIXTURES_DIR = BASE_DIR / "tests" / "fixtures"

EXPORT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="NDIS Plan Automation MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/exports", StaticFiles(directory=str(EXPORT_DIR)), name="exports")


# ---- request models -----------------------------------------------------------------------
class ParseRequest(BaseModel):
    intake_text: str


class DecisionIn(BaseModel):
    checkpoint_id: str
    field: str
    value_shown: str
    decision: str  # "yes" | "no"
    reviewer: str = ""
    timestamp: str = ""
    note: str = ""


class DecisionsRequest(BaseModel):
    session_id: str
    decisions: List[DecisionIn]


class SessionRequest(BaseModel):
    session_id: str


# ---- routes -------------------------------------------------------------------------------
@app.get("/")
def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/api/participants")
def participants():
    out = {}
    for key in ("a", "b", "c"):
        path = FIXTURES_DIR / f"participant_{key}.txt"
        if path.exists():
            out[key] = path.read_text(encoding="utf-8").strip()
    return out


@app.post("/api/parse")
def parse(req: ParseRequest):
    if not req.intake_text.strip():
        raise HTTPException(400, "intake_text is empty.")
    session = create_session(req.intake_text)
    try:
        profile = parse_intake(req.intake_text, session.id)
    except Exception as exc:
        raise HTTPException(502, f"Intake parsing failed: {exc}")
    session.profile = profile
    session.checkpoints = build_checkpoints(profile)
    return {
        "session_id": session.id,
        "profile": profile.model_dump(),
        "checkpoints": [c.model_dump() for c in session.checkpoints],
    }


@app.post("/api/decisions")
def decisions(req: DecisionsRequest):
    session = _get(req.session_id)
    now = _dt.datetime.now().astimezone().isoformat(timespec="seconds")
    session.decisions = [
        Decision(
            checkpoint_id=d.checkpoint_id,
            field=d.field,
            value_shown=d.value_shown,
            decision="no" if d.decision == "no" else "yes",
            reviewer=d.reviewer or "support worker",
            timestamp=d.timestamp or now,
            note=d.note,
        )
        for d in req.decisions
    ]
    pending = all_confirmed(session.checkpoints, session.decisions)
    return {"stored": len(session.decisions), "pending": [c.model_dump() for c in pending]}


@app.post("/api/generate")
def generate(req: SessionRequest):
    session = _get(req.session_id)
    if session.profile is None:
        raise HTTPException(400, "Parse the intake before generating.")
    pending = all_confirmed(session.checkpoints, session.decisions)
    if pending:
        raise HTTPException(
            400,
            f"{len(pending)} checkpoint(s) still need a Yes/No decision before generating.",
        )

    confirmed = apply_decisions(session.profile, session.decisions)
    try:
        plan = generate_plan(confirmed, session.id)
    except Exception as exc:
        raise HTTPException(502, f"Plan generation failed: {exc}")

    report = validate(plan, confirmed.profile)
    documents = {
        "care-plan": render_care_plan(confirmed.profile, plan),
        "progress-notes": render_progress_notes(confirmed.profile, plan),
        "risk-consent": render_risk_consent(session.profile, session.decisions),
    }

    session.plan = plan
    session.report = report
    session.documents = documents

    return {
        "documents": documents,
        "report": [f.model_dump() for f in report.findings],
        "passed": report.passed,
        "excluded": confirmed.excluded,
    }


@app.post("/api/export")
def export(req: SessionRequest):
    session = _get(req.session_id)
    if not session.documents or session.profile is None:
        raise HTTPException(400, "Generate the documents before exporting.")
    # Re-render the Risk & Consent sheet so it reflects the latest decisions.
    session.documents["risk-consent"] = render_risk_consent(session.profile, session.decisions)
    written = export_documents(session.profile.name, session.documents)
    files = [
        {"name": name, "url": f"/exports/{name}" if Path(path).exists() else None, "detail": path}
        for name, path in written.items()
    ]
    return {"files": files}


def _get(session_id: str):
    try:
        return get_session(session_id)
    except KeyError:
        raise HTTPException(404, "Unknown session_id — parse the intake again.")
