"""Agent 1 — Intake Parser. Free-text intake -> structured ParticipantProfile."""
from __future__ import annotations

import os

from ..llm import structured_call
from ..models import CurrentSupport, EmergencyContact, ExistingPlan, Medication, ParticipantProfile
from .prompts import PARSER_SYSTEM


def _mock_profile() -> ParticipantProfile:
    return ParticipantProfile(
        name="Liam Carter",
        dob="2001-03-14",
        ndis_number="430182905",
        address="Shared house, Footscray VIC",
        contact="[MISSING]",
        emergency_contact=EmergencyContact(name="Sarah Carter", phone="0400 111 222", relationship="Mother"),
        gp="Dr Nguyen, Footscray Family Clinic",
        preferred_hospital="[MISSING]",
        living_arrangement="Shared house with two housemates in Footscray VIC",
        cultural_background="[MISSING]",
        communication_preferences="Verbal; prefers short sentences and visual schedules",
        likes="Trains, drawing, quiet spaces",
        dislikes="Loud unexpected noise and crowds",
        routines="[MISSING]",
        primary_disability="Autism Spectrum Disorder (Level 2)",
        secondary_conditions=[],
        medications=[],
        allergies=[],
        behavioural_notes="Gets anxious in new places; needs prompting for budgeting",
        seizure_notes="[MISSING]",
        existing_plans=[],
        informal_supports=["Mum (Sarah Carter) visits weekly"],
        stated_goals=[
            "Travel independently on the train to art class",
            "Make a couple of friends",
            "Cook two simple meals on his own",
        ],
        current_supports=[
            CurrentSupport(service="support worker", frequency="6 hrs/week", raw="support worker 6 hrs/week community access"),
            CurrentSupport(service="occupational therapy", frequency="fortnightly", raw="OT fortnightly for daily-living skills"),
        ],
    )


def _mock_mode() -> bool:
    if os.getenv("NDIS_MOCK", "").lower() in ("1", "true", "yes"):
        return True
    return not (os.getenv("NDIS_API_KEY") or os.getenv("OPENCODE_API_KEY"))


def parse_intake(intake_text: str, session_id: str) -> ParticipantProfile:
    if _mock_mode():
        return _mock_profile()
    return structured_call(
        system_prompt=PARSER_SYSTEM,
        user_text="INTAKE NOTES:\n\n" + intake_text.strip(),
        output_model=ParticipantProfile,
        session_id=session_id,
        agent="parser",
    )
