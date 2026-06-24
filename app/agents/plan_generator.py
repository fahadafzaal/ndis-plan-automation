"""Agent 2 — Plan Generator. Confirmed input -> structured GeneratedPlan."""
from __future__ import annotations

import datetime as _dt
import json
import os

from ..checkpoints import ConfirmedInput
from ..llm import structured_call
from ..models import FundedSupport, GeneratedPlan, Goal, NoteEntry, SupportStrategy
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


def _mock_mode() -> bool:
    if os.getenv("NDIS_MOCK", "").lower() in ("1", "true", "yes"):
        return True
    return not (os.getenv("NDIS_API_KEY") or os.getenv("OPENCODE_API_KEY"))


def _mock_plan() -> GeneratedPlan:
    today = _dt.date.today().isoformat()
    review = (_dt.date.today() + _dt.timedelta(days=365)).isoformat()
    return GeneratedPlan(
        plan_date=today,
        review_date=review,
        goals=[
            Goal(number=1, outcome_text="Liam will travel independently on public transport to his weekly art class within 6 months."),
            Goal(number=2, outcome_text="Liam will build social connections by joining a community group and developing two new friendships within 12 months."),
            Goal(number=3, outcome_text="Liam will prepare two simple meals independently at least twice per week within 6 months."),
        ],
        funded_supports=[
            FundedSupport(
                support="Community Access Support Worker",
                service="support worker",
                category="Core",
                subcategory="Daily Living",
                frequency="6 hrs/week",
                delivered_by="Registered support worker",
                goal_refs=[1, 2, 3],
            ),
            FundedSupport(
                support="Occupational Therapy",
                service="occupational therapy",
                category="Capacity Building",
                subcategory="Improved Daily Living",
                frequency="Fortnightly",
                delivered_by="Registered occupational therapist",
                goal_refs=[1, 3],
            ),
        ],
        support_strategies=[
            SupportStrategy(support_need="Independent travel", strategy="Use visual schedules and practice train routes with worker before solo travel."),
            SupportStrategy(support_need="Anxiety in new places", strategy="Preview new locations via photos/video; arrive early with support worker present first time."),
            SupportStrategy(support_need="Meal preparation", strategy="Worker provides step-by-step visual recipe cards; Liam completes tasks independently with verbal prompts only."),
        ],
        note_entries=[
            NoteEntry(
                date=today,
                start_time="10:00",
                end_time="12:00",
                worker_name="[Worker Name]",
                participant_name="Liam Carter",
                location="Footscray Train Station / Community",
                support_type="Community Access",
                supports_delivered="Practised train route to Flinders Street; purchased ticket independently; navigated to platform with minimal prompting.",
                participation="Liam initiated ticket purchase, identified correct platform, and maintained composure in a busy station environment.",
                observations="Liam appeared calm and focused throughout; only required one verbal prompt when platform changed. Demonstrated improved confidence compared to previous session.",
                goal_ref=1,
                incidents="None",
                follow_up="Schedule solo trial run next session with worker observing from a distance.",
                worker_signoff="[Worker Name] — Support Worker",
            ),
        ],
    )


def generate_plan(confirmed: ConfirmedInput, session_id: str) -> GeneratedPlan:
    if _mock_mode():
        return _mock_plan()
    return structured_call(
        system_prompt=GENERATOR_SYSTEM,
        user_text=_build_user_message(confirmed),
        output_model=GeneratedPlan,
        session_id=session_id,
        agent="generator",
    )
