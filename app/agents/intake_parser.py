"""Agent 1 — Intake Parser. Free-text intake -> structured ParticipantProfile."""
from __future__ import annotations

from ..llm import structured_call
from ..models import ParticipantProfile
from .prompts import PARSER_SYSTEM


def parse_intake(intake_text: str, session_id: str) -> ParticipantProfile:
    return structured_call(
        system_prompt=PARSER_SYSTEM,
        user_text="INTAKE NOTES:\n\n" + intake_text.strip(),
        output_model=ParticipantProfile,
        session_id=session_id,
        agent="parser",
    )
