"""C1–C7 critical-checkpoint derivation and decision application (spec §3.2).

Checkpoints are derived deterministically from the parsed profile and surfaced to the human as
cards. Each card is keyed by ``(checkpoint_id, field)`` — the same pair stored in the oversight
record. A "No" decision flags and *excludes* that field/item: it is replaced with the EXCLUDED
sentinel (single fields) or dropped from the confirmed set (per-item goals/supports) so it
cannot silently flow into the generated documents.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from typing import Dict, List, Tuple

from .funding_rules import classify_support
from .models import (
    EXCLUDED,
    MISSING,
    Checkpoint,
    CurrentSupport,
    Decision,
    ParticipantProfile,
)

# Why each checkpoint is human-gated (spec §3.2 table).
WHY = {
    "C1": "Primary disability & secondary diagnoses drive the whole plan.",
    "C2": "Medications are safety-critical and must never be auto-trusted.",
    "C3": "Allergies / adverse reactions are safety-critical.",
    "C4": "Behavioural support / seizure / restrictive-practice flags are high-risk and regulated.",
    "C5": "Each goal must be participant-driven.",
    "C6": "Wrong funding category = rejected claim.",
    "C7": "Emergency contact correctness is safety-critical.",
}


def format_medications(meds) -> str:
    if not meds:
        return "None reported"
    parts = []
    for m in meds:
        bits = [b for b in (m.name, m.dose, m.timing) if b and b != MISSING]
        parts.append(" ".join(bits) if bits else MISSING)
    return "; ".join(parts)


def _format_emergency_contact(ec) -> str:
    bits = []
    if ec.name and ec.name != MISSING:
        bits.append(ec.name)
    if ec.relationship and ec.relationship != MISSING:
        bits.append(f"({ec.relationship})")
    if ec.phone and ec.phone != MISSING:
        bits.append(ec.phone)
    return " ".join(bits) if bits else MISSING


def _format_flags(profile: ParticipantProfile) -> str:
    parts = []
    if profile.behavioural_notes and profile.behavioural_notes not in (MISSING, ""):
        parts.append(f"Behavioural: {profile.behavioural_notes}")
    if profile.seizure_notes and profile.seizure_notes not in (MISSING, ""):
        parts.append(f"Seizure: {profile.seizure_notes}")
    for p in profile.existing_plans:
        state = "present" if p.in_place else "NOT in place"
        held = f", held by {p.held_by}" if p.held_by and p.held_by != MISSING else ""
        parts.append(f"{p.name}: {state}{held}")
    return "; ".join(parts) if parts else "None reported"


def build_checkpoints(profile: ParticipantProfile) -> List[Checkpoint]:
    """Derive the C1–C7 cards from a parsed profile."""
    cards: List[Checkpoint] = []

    # C1 — primary disability & secondary diagnoses
    secondary = ", ".join(profile.secondary_conditions) if profile.secondary_conditions else "none"
    cards.append(Checkpoint(
        checkpoint_id="C1", field="primary_disability",
        value_shown=f"{profile.primary_disability} (secondary: {secondary})", why=WHY["C1"],
    ))

    # C2 — medications
    cards.append(Checkpoint(
        checkpoint_id="C2", field="medications",
        value_shown=format_medications(profile.medications), why=WHY["C2"],
    ))

    # C3 — allergies
    cards.append(Checkpoint(
        checkpoint_id="C3", field="allergies",
        value_shown=", ".join(profile.allergies) if profile.allergies else "None reported",
        why=WHY["C3"],
    ))

    # C4 — behavioural / seizure / restrictive-practice flags
    cards.append(Checkpoint(
        checkpoint_id="C4", field="behavioural_seizure_flags",
        value_shown=_format_flags(profile), why=WHY["C4"],
    ))

    # C5 — each stated goal (one card per goal)
    for i, goal in enumerate(profile.stated_goals, start=1):
        cards.append(Checkpoint(
            checkpoint_id="C5", field=f"goal_{i}", value_shown=goal, why=WHY["C5"],
        ))

    # C6 — each current support + its computed funding category
    for i, sup in enumerate(profile.current_supports, start=1):
        cls = classify_support(sup.service)
        flag = "  ⚠ needs review" if cls.ambiguous else ""
        cards.append(Checkpoint(
            checkpoint_id="C6", field=f"support_{i}",
            value_shown=f"{sup.service} ({sup.frequency}) → {cls.category} ({cls.subcategory}){flag}",
            why=WHY["C6"] + " " + cls.reason,
        ))

    # C7 — emergency contact
    cards.append(Checkpoint(
        checkpoint_id="C7", field="emergency_contact",
        value_shown=_format_emergency_contact(profile.emergency_contact), why=WHY["C7"],
    ))

    return cards


def decisions_index(decisions: List[Decision]) -> Dict[Tuple[str, str], Decision]:
    return {(d.checkpoint_id, d.field): d for d in decisions}


@dataclass
class ConfirmedSupport:
    service: str
    frequency: str
    category: str
    subcategory: str
    raw: str


@dataclass
class ConfirmedInput:
    """What gets handed to the Plan Generator after the human checkpoint."""

    profile: ParticipantProfile
    goals: List[str] = dc_field(default_factory=list)              # confirmed stated goals
    supports: List[ConfirmedSupport] = dc_field(default_factory=list)  # confirmed supports + categories
    excluded: List[str] = dc_field(default_factory=list)           # human-readable list of "No" items


def all_confirmed(checkpoints: List[Checkpoint], decisions: List[Decision]) -> List[Checkpoint]:
    """Return any checkpoints that still lack a Yes/No decision."""
    idx = decisions_index(decisions)
    return [c for c in checkpoints if (c.checkpoint_id, c.field) not in idx]


def apply_decisions(profile: ParticipantProfile, decisions: List[Decision]) -> ConfirmedInput:
    """Build the confirmed input for the generator, excluding any field the human said No to."""
    idx = decisions_index(decisions)

    def said_no(checkpoint_id: str, field: str) -> bool:
        d = idx.get((checkpoint_id, field))
        return d is not None and d.decision == "no"

    confirmed = profile.model_copy(deep=True)
    excluded: List[str] = []

    if said_no("C1", "primary_disability"):
        confirmed.primary_disability = EXCLUDED
        confirmed.secondary_conditions = []
        excluded.append("Primary disability (C1)")
    if said_no("C2", "medications"):
        confirmed.medications = []
        excluded.append("Medications (C2) — render as flagged, do not use values")
    if said_no("C3", "allergies"):
        confirmed.allergies = []
        excluded.append("Allergies (C3)")
    if said_no("C4", "behavioural_seizure_flags"):
        confirmed.behavioural_notes = EXCLUDED
        confirmed.seizure_notes = ""
        confirmed.existing_plans = []
        excluded.append("Behavioural/seizure flags (C4)")
    if said_no("C7", "emergency_contact"):
        confirmed.emergency_contact = confirmed.emergency_contact.model_copy(
            update={"name": EXCLUDED, "phone": EXCLUDED, "relationship": EXCLUDED}
        )
        excluded.append("Emergency contact (C7)")

    # C5 — keep only confirmed goals
    goals: List[str] = []
    for i, goal in enumerate(profile.stated_goals, start=1):
        if said_no("C5", f"goal_{i}"):
            excluded.append(f"Goal (C5): {goal}")
        else:
            goals.append(goal)

    # C6 — keep only confirmed supports, with their deterministically-computed categories
    supports: List[ConfirmedSupport] = []
    for i, sup in enumerate(profile.current_supports, start=1):
        if said_no("C6", f"support_{i}"):
            excluded.append(f"Support (C6): {sup.service}")
            continue
        cls = classify_support(sup.service)
        supports.append(ConfirmedSupport(
            service=sup.service, frequency=sup.frequency,
            category=cls.category, subcategory=cls.subcategory, raw=sup.raw,
        ))

    return ConfirmedInput(profile=confirmed, goals=goals, supports=supports, excluded=excluded)
