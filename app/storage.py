"""In-memory session store keyed by session_id.

Holds the per-session pipeline state (profile, checkpoints, decisions, plan, report, rendered
documents). In-memory is sufficient for the local MVP; nothing here persists across restarts.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .models import (
    Checkpoint,
    Decision,
    GeneratedPlan,
    ParticipantProfile,
    ValidationReport,
)


@dataclass
class Session:
    id: str
    intake_text: str = ""
    profile: Optional[ParticipantProfile] = None
    checkpoints: List[Checkpoint] = field(default_factory=list)
    decisions: List[Decision] = field(default_factory=list)
    plan: Optional[GeneratedPlan] = None
    report: Optional[ValidationReport] = None
    documents: Dict[str, str] = field(default_factory=dict)  # doc key -> markdown


_sessions: Dict[str, Session] = {}


def create_session(intake_text: str) -> Session:
    sid = uuid.uuid4().hex[:12]
    session = Session(id=sid, intake_text=intake_text)
    _sessions[sid] = session
    return session


def get_session(session_id: str) -> Session:
    session = _sessions.get(session_id)
    if session is None:
        raise KeyError(f"Unknown session_id: {session_id}")
    return session
