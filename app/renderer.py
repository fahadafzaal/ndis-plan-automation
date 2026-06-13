"""Deterministic Markdown rendering of the 3 documents.

The Care Plan and Progress Notes are rendered from the validated structured objects, so the
exported content is exactly what the validator checked. The Risk & Consent sheet is rendered
from the human's Yes/No decision log — it is the human-oversight artifact and contains no
LLM-generated content.
"""
from __future__ import annotations

from typing import List

from .checkpoints import format_medications
from .models import (
    MISSING,
    Decision,
    GeneratedPlan,
    ParticipantProfile,
)


def _v(value: str) -> str:
    """Display a value, surfacing [MISSING]/flagged markers in bold so they stand out."""
    if value in (None, ""):
        return "—"
    if value == MISSING or str(value).startswith("[FLAGGED"):
        return f"**{value}**"
    return str(value)


def render_care_plan(profile: ParticipantProfile, plan: GeneratedPlan) -> str:
    p = profile
    ec = p.emergency_contact
    L: List[str] = []
    a = L.append

    a(f"# Care / Support Plan — {_v(p.name)}\n")
    a(f"*Plan date: {plan.plan_date} · Review date: {plan.review_date}*\n")

    a("## 1. Participant details\n")
    a(f"- **Name:** {_v(p.name)}")
    a(f"- **Date of birth:** {_v(p.dob)}")
    a(f"- **NDIS number:** {_v(p.ndis_number)}")
    a(f"- **Address:** {_v(p.address)}")
    a(f"- **Contact:** {_v(p.contact)}")
    a(f"- **Emergency contact:** {_v(ec.name)} "
      f"{('(' + ec.relationship + ')') if ec.relationship and ec.relationship != MISSING else ''} "
      f"{_v(ec.phone)}")
    a(f"- **GP:** {_v(p.gp)}")
    a(f"- **Preferred hospital:** {_v(p.preferred_hospital)}\n")

    a("## 2. About me\n")
    a(f"- **Living arrangement:** {_v(p.living_arrangement)}")
    a(f"- **Cultural background:** {_v(p.cultural_background)}")
    a(f"- **Communication preferences:** {_v(p.communication_preferences)}")
    a(f"- **Likes:** {_v(p.likes)}")
    a(f"- **Dislikes:** {_v(p.dislikes)}")
    a(f"- **Routines:** {_v(p.routines)}\n")

    a("## 3. Disability & health\n")
    a(f"- **Primary disability:** {_v(p.primary_disability)}")
    secondary = ", ".join(p.secondary_conditions) if p.secondary_conditions else "None reported"
    a(f"- **Secondary conditions:** {secondary}")
    a(f"- **Medications:** {format_medications(p.medications)}")
    a(f"- **Allergies:** {', '.join(p.allergies) if p.allergies else 'None reported'}")
    a(f"- **Behavioural notes:** {_v(p.behavioural_notes) if p.behavioural_notes else 'None reported'}")
    a(f"- **Seizure notes:** {_v(p.seizure_notes) if p.seizure_notes else 'None reported'}")
    if p.existing_plans:
        a("- **Existing formal plans:**")
        for plan_ref in p.existing_plans:
            state = "in place" if plan_ref.in_place else "NOT in place"
            held = f", held by {plan_ref.held_by}" if plan_ref.held_by and plan_ref.held_by != MISSING else ""
            a(f"    - {plan_ref.name} — {state}{held}")
    else:
        a("- **Existing formal plans:** None reported")
    a("")

    a("## 4. Informal supports\n")
    if p.informal_supports:
        for s in p.informal_supports:
            a(f"- {s}")
    else:
        a("- None reported")
    a("")

    a("## 5. Goals\n")
    for g in sorted(plan.goals, key=lambda x: x.number):
        a(f"**Goal {g.number}.** {g.outcome_text}\n")

    a("## 6. Funded supports\n")
    a("| Support | Service | Funding category | Frequency | Delivered by | Goal(s) |")
    a("|---|---|---|---|---|---|")
    for fs in plan.funded_supports:
        refs = ", ".join(str(r) for r in fs.goal_refs)
        a(f"| {fs.support} | {fs.service} | {fs.category} ({fs.subcategory}) | "
          f"{fs.frequency} | {fs.delivered_by} | {refs} |")
    a("")

    a("## 7. Support strategies\n")
    if plan.support_strategies:
        for ss in plan.support_strategies:
            a(f"- **{ss.support_need}:** {ss.strategy}")
    else:
        a("- None recorded")
    a("")

    a("## 8. Review date\n")
    a(f"This plan is to be reviewed by **{plan.review_date}** (at least annually).\n")

    return "\n".join(L)


def render_progress_notes(profile: ParticipantProfile, plan: GeneratedPlan) -> str:
    L: List[str] = []
    a = L.append

    a(f"# Progress / Shift Note Logbook — {_v(profile.name)}\n")
    a("Each entry uses the 8-element structure. SOAP mapping: **S**ubjective (participant's words), "
      "**O**bjective (observations), **A**ssessment (analysis), **P**lan (next steps).\n")

    a("## Blank entry template\n")
    a("- **Shift details:** date, start time, end time, worker, participant, location, support type")
    a("- **Supports delivered:** specific tasks (not categories)")
    a("- **Participant participation:** what they did independently; prompts/assistance given")
    a("- **Observations:** objective mood/engagement; any change from baseline")
    a("- **Goal linkage:** which numbered goal the activity served")
    a("- **Incidents / changes:** anything significant")
    a("- **Follow-up actions:** what happens next / who to notify")
    a("- **Worker sign-off:**\n")

    a("## Example entries\n")
    for i, ne in enumerate(plan.note_entries, start=1):
        a(f"### Entry {i} — {ne.date}\n")
        a(f"- **Shift details:** {ne.date}, {ne.start_time}–{ne.end_time}, worker {ne.worker_name}, "
          f"participant {ne.participant_name}, {ne.location}, {ne.support_type}")
        a(f"- **Supports delivered:** {ne.supports_delivered}")
        a(f"- **Participant participation:** {ne.participation}")
        a(f"- **Observations:** {ne.observations}")
        a(f"- **Goal linkage:** Goal {ne.goal_ref}")
        a(f"- **Incidents / changes:** {ne.incidents}")
        a(f"- **Follow-up actions:** {ne.follow_up}")
        a(f"- **Worker sign-off:** {ne.worker_signoff}\n")

    return "\n".join(L)


def render_risk_consent(profile: ParticipantProfile, decisions: List[Decision]) -> str:
    L: List[str] = []
    a = L.append

    a(f"# Risk & Consent Summary — {_v(profile.name)}\n")
    a("This is the human-oversight record. Each row is a critical point the support worker "
      "reviewed. A **No** decision flags the field/item, which is excluded and locked out of the "
      "final documents until corrected.\n")

    a("| Checkpoint | Field | Value shown | Decision | Reviewer | Timestamp | Note |")
    a("|---|---|---|---|---|---|---|")
    for d in sorted(decisions, key=lambda x: (x.checkpoint_id, x.field)):
        decision = "✅ Yes" if d.decision == "yes" else "🚫 No (excluded)"
        value = d.value_shown.replace("|", "\\|").replace("\n", " ")
        note = (d.note or "").replace("|", "\\|").replace("\n", " ")
        a(f"| {d.checkpoint_id} | {d.field} | {value} | {decision} | "
          f"{d.reviewer or '—'} | {d.timestamp} | {note or '—'} |")
    a("")

    return "\n".join(L)
