"""Agent 2 — Plan Generator. Confirmed input -> structured GeneratedPlan."""
from __future__ import annotations

import datetime as _dt
import json

from ..checkpoints import ConfirmedInput
from ..llm import structured_call
from ..models import GeneratedPlan
from .prompts import GENERATOR_SYSTEM


def _build_user_message(confirmed: ConfirmedInput) -> str:
    today = _dt.date.today().isoformat()
    profile_json = confirmed.profile.model_dump_json(indent=2)

    goals = "\n".join(f"  - {g}" for g in confirmed.goals) or "  (none confirmed)"

    if confirmed.supports:
        supports = "\n".join(
            f"  - {s.service} | frequency: {s.frequency} | USE CATEGORY: "
            f"{s.category} ({s.subcategory})"
            for s in confirmed.supports
        )
    else:
        supports = "  (none confirmed)"

    excluded = "\n".join(f"  - {e}" for e in confirmed.excluded) or "  (none)"

    return f"""\
Today's date is {today} — use it for plan_date.

HUMAN-CONFIRMED PARTICIPANT PROFILE (JSON). Treat "[MISSING]" and any "[FLAGGED — excluded …]"
markers literally; do not fill them in:

{profile_json}

CONFIRMED PARTICIPANT GOALS (formalise these into numbered outcome goals):
{goals}

CONFIRMED FUNDED SUPPORTS (create one funded support each; use the stated category exactly and
link each to at least one goal number):
{supports}

EXCLUDED BY THE HUMAN (do NOT include these values anywhere in the plan):
{excluded}

Produce the structured plan now.
"""


def generate_plan(confirmed: ConfirmedInput, session_id: str) -> GeneratedPlan:
    return structured_call(
        system_prompt=GENERATOR_SYSTEM,
        user_text=_build_user_message(confirmed),
        output_model=GeneratedPlan,
        session_id=session_id,
        agent="generator",
    )
