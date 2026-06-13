"""Pydantic data models for the NDIS Plan Automation MVP.

Two of these are LLM *output* schemas (``ParticipantProfile``, ``GeneratedPlan``) used with
Anthropic structured outputs. For strict structured outputs every field must be present in the
response, so the LLM models declare all fields as required (no defaults) — the model emits the
``MISSING`` sentinel or an empty list when a value is absent rather than omitting the key.

The rest (``Decision``, ``Finding``, ``ValidationReport``) are plain internal models.
"""
from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field

# Sentinel the Intake Parser must emit for any required field not present in the intake (R6).
MISSING = "[MISSING]"

# Sentinel the Plan Generator receives for a field the human rejected at a checkpoint (a "No").
EXCLUDED = "[FLAGGED — excluded, confirm with provider]"

Category = Literal["Core", "Capacity Building", "Capital"]


# --------------------------------------------------------------------------------------------
# Intake Parser output  (Agent 1)
# --------------------------------------------------------------------------------------------
class Medication(BaseModel):
    name: str = Field(description="Medication name, or [MISSING] if not stated.")
    dose: str = Field(description="Dose, e.g. '500mg', or [MISSING] if not stated.")
    timing: str = Field(description="Timing/frequency, e.g. 'twice daily', or [MISSING].")


class EmergencyContact(BaseModel):
    name: str = Field(description="Contact person's name, or [MISSING].")
    phone: str = Field(description="Contact phone number, or [MISSING].")
    relationship: str = Field(description="Relationship to participant, or [MISSING].")


class ExistingPlan(BaseModel):
    name: str = Field(description="e.g. 'Seizure Management Plan', 'Behaviour Support Plan'.")
    held_by: str = Field(description="Who holds it, or [MISSING].")
    in_place: bool = Field(description="True if the plan exists/is in place, False if absent.")


class CurrentSupport(BaseModel):
    service: str = Field(
        description="The support/service named in the intake, e.g. 'support worker - community "
        "access', 'occupational therapy', 'support coordination', 'power wheelchair'."
    )
    frequency: str = Field(description="Frequency or quantity, e.g. '6 hrs/week', or [MISSING].")
    raw: str = Field(description="The original phrase from the intake describing this support.")


class ParticipantProfile(BaseModel):
    # 1. Participant details
    name: str
    dob: str
    ndis_number: str
    address: str
    contact: str
    emergency_contact: EmergencyContact
    gp: str
    preferred_hospital: str
    # 2. About me
    living_arrangement: str
    cultural_background: str
    communication_preferences: str
    likes: str
    dislikes: str
    routines: str
    # 3. Disability & health
    primary_disability: str
    secondary_conditions: List[str]
    medications: List[Medication]
    allergies: List[str]
    behavioural_notes: str
    seizure_notes: str
    existing_plans: List[ExistingPlan]
    # 4. Informal supports
    informal_supports: List[str]
    # 5. Goals (participant's own stated wants — formalised later by the generator)
    stated_goals: List[str]
    # 6. Current/funded supports the intake mentions
    current_supports: List[CurrentSupport]


# --------------------------------------------------------------------------------------------
# Plan Generator output  (Agent 2)
# --------------------------------------------------------------------------------------------
class Goal(BaseModel):
    number: int = Field(description="Goal number, starting at 1.")
    outcome_text: str = Field(description="The goal phrased as a participant-driven outcome.")


class FundedSupport(BaseModel):
    support: str = Field(description="Short label for the support, e.g. 'Community access worker'.")
    service: str = Field(
        description="The service keyword used for funding classification, e.g. 'support worker', "
        "'occupational therapy', 'physiotherapy', 'support coordination', 'power wheelchair'."
    )
    category: Category = Field(description="Core, Capacity Building, or Capital.")
    subcategory: str = Field(
        description="e.g. 'Daily Living', 'Improved Daily Living', 'Support Coordination', "
        "'Consumables', or the item type for Capital."
    )
    frequency: str
    delivered_by: str = Field(description="Who delivers it (role/provider type).")
    goal_refs: List[int] = Field(description="Goal numbers this support helps achieve (>=1).")


class SupportStrategy(BaseModel):
    support_need: str
    strategy: str = Field(description="Concrete day-to-day 'how we help' action.")


class NoteEntry(BaseModel):
    date: str
    start_time: str
    end_time: str
    worker_name: str
    participant_name: str
    location: str
    support_type: str = Field(description="e.g. 'Community Access', 'Daily Living'.")
    supports_delivered: str = Field(description="Specific tasks performed, not categories.")
    participation: str = Field(description="What the participant did; prompts/assistance given.")
    observations: str = Field(description="Objective mood/engagement/changes — not 'had a good day'.")
    goal_ref: int = Field(description="Which numbered goal this activity served.")
    incidents: str = Field(description="Anything significant, or 'None'.")
    follow_up: str = Field(description="Next steps / who to notify.")
    worker_signoff: str


class GeneratedPlan(BaseModel):
    plan_date: str = Field(description="Plan date in ISO format YYYY-MM-DD.")
    review_date: str = Field(description="Review date in ISO format, within 12 months of plan_date.")
    goals: List[Goal]
    funded_supports: List[FundedSupport]
    support_strategies: List[SupportStrategy]
    note_entries: List[NoteEntry]


# --------------------------------------------------------------------------------------------
# Human oversight + validation  (internal, not LLM output)
# --------------------------------------------------------------------------------------------
class Checkpoint(BaseModel):
    """A C1–C7 critical card surfaced to the human."""

    checkpoint_id: str  # "C1".."C7"
    field: str
    value_shown: str
    why: str


class Decision(BaseModel):
    """One row of the human-oversight record (spec §3.2)."""

    checkpoint_id: str
    field: str
    value_shown: str
    decision: Literal["yes", "no"]
    reviewer: str
    timestamp: str
    note: str = ""


class Finding(BaseModel):
    rule: str  # "R1".."R7"
    status: Literal["pass", "fail", "warn"]
    message: str


class ValidationReport(BaseModel):
    findings: List[Finding]

    @property
    def passed(self) -> bool:
        return all(f.status != "fail" for f in self.findings)
