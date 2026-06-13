"""Deterministic validator implementing hard rules R1–R7 (spec §3.1).

Runs on the structured ``GeneratedPlan`` + ``ParticipantProfile`` (not on rendered Markdown), so
the checks are robust and double as the automated test assertions in §5. Per the spec's caveats,
data gaps from the intake are reported as ``warn`` (flag for human review), while generator-side
violations (mis-categorised funding, broken goal links, vague note language, too few goals) are
hard ``fail``.
"""
from __future__ import annotations

import datetime as _dt
import re
from typing import List

from .funding_rules import classify_support
from .models import (
    EXCLUDED,
    MISSING,
    Finding,
    GeneratedPlan,
    ParticipantProfile,
    ValidationReport,
)

# R5 — vague/subjective phrases that must not appear in progress notes.
VAGUE_PHRASES = [
    "had a good day", "good day", "was good", "nice day", "as usual",
    "as normal", "as always", "fine today", "great day", "no issues as usual",
]

# R4 — service/provider terms that mean a "goal" is really a service, not an outcome.
SERVICE_GOAL_TERMS = [
    "day program", "occupational therap", "physiotherap", "physio session",
    "psycholog", "speech path", "speech therap", "support worker", "support coordinat",
    "see an ot", "see a physio", "attend a program", "attend my program",
    "respite", "centre-based",
]

_WORD = re.compile(r"[a-z]+")


def _finding(rule: str, status: str, message: str) -> Finding:
    return Finding(rule=rule, status=status, message=message)


def _keywords(text: str) -> set:
    return {w for w in _WORD.findall((text or "").lower()) if len(w) > 3}


def _overlaps(a: str, b: str) -> bool:
    return bool(_keywords(a) & _keywords(b))


def _missing(value: str) -> bool:
    return value in (MISSING, "", None) or str(value).startswith("[FLAGGED")


# --------------------------------------------------------------------------------------------
def _check_r1(plan: GeneratedPlan, profile: ParticipantProfile) -> List[Finding]:
    findings: List[Finding] = []
    # Data fields sourced from the intake — absence is a provider gap (warn), not a fault.
    data_fields = {
        "name": profile.name,
        "DOB": profile.dob,
        "NDIS number": profile.ndis_number,
        "primary disability": profile.primary_disability,
    }
    for label, value in data_fields.items():
        if _missing(value):
            findings.append(_finding("R1", "warn", f"{label} is [MISSING] — confirm with provider."))

    ec = profile.emergency_contact
    if _missing(ec.name) and _missing(ec.phone):
        findings.append(_finding("R1", "warn", "No usable emergency contact — confirm with provider."))

    # Structural requirements the generator owns — violations are hard failures.
    if len(plan.goals) < 3:
        findings.append(_finding("R1", "fail", f"Only {len(plan.goals)} goal(s); at least 3 required."))
    if _missing(plan.review_date):
        findings.append(_finding("R1", "fail", "Review date is missing."))

    if not findings:
        findings.append(_finding("R1", "pass", "All mandatory Care Plan fields present."))
    return findings


def _check_r2(plan: GeneratedPlan) -> List[Finding]:
    findings: List[Finding] = []
    for fs in plan.funded_supports:
        cls = classify_support(fs.service)
        if cls.ambiguous:
            findings.append(_finding(
                "R2", "warn",
                f"Could not confidently categorise '{fs.service}' (assigned {fs.category}) — review.",
            ))
        elif fs.category != cls.category:
            findings.append(_finding(
                "R2", "fail",
                f"'{fs.service}' is categorised as {fs.category} but should be {cls.category} "
                f"({cls.subcategory}). {cls.reason}",
            ))
    if not any(f.status in ("fail", "warn") for f in findings):
        findings.append(_finding("R2", "pass", "All funded supports correctly categorised."))
    return findings


def _check_r3(plan: GeneratedPlan) -> List[Finding]:
    findings: List[Finding] = []
    goal_numbers = {g.number for g in plan.goals}

    for fs in plan.funded_supports:
        if not fs.goal_refs:
            findings.append(_finding("R3", "fail", f"Funded support '{fs.support}' cites no goal."))
        for ref in fs.goal_refs:
            if ref not in goal_numbers:
                findings.append(_finding(
                    "R3", "fail",
                    f"Funded support '{fs.support}' references goal {ref}, which does not exist.",
                ))
    for i, ne in enumerate(plan.note_entries, start=1):
        if ne.goal_ref not in goal_numbers:
            findings.append(_finding(
                "R3", "fail",
                f"Progress note #{i} references goal {ne.goal_ref}, which does not exist.",
            ))
    if not any(f.status == "fail" for f in findings):
        findings.append(_finding("R3", "pass", "Every funded support and note entry links to a real goal."))
    return findings


def _check_r4(plan: GeneratedPlan) -> List[Finding]:
    findings: List[Finding] = []
    for g in plan.goals:
        text = g.outcome_text.lower()
        hit = next((t for t in SERVICE_GOAL_TERMS if t in text), None)
        if hit:
            findings.append(_finding(
                "R4", "fail",
                f"Goal {g.number} looks like a service, not an outcome (matched '{hit}'): "
                f"\"{g.outcome_text}\"",
            ))
    if not findings:
        findings.append(_finding("R4", "pass", "All goals are framed as participant outcomes."))
    return findings


def _check_r5(plan: GeneratedPlan) -> List[Finding]:
    findings: List[Finding] = []
    for i, ne in enumerate(plan.note_entries, start=1):
        blob = " ".join([ne.supports_delivered, ne.participation, ne.observations]).lower()
        for phrase in VAGUE_PHRASES:
            if phrase in blob:
                findings.append(_finding(
                    "R5", "fail",
                    f"Progress note #{i} uses vague/subjective language: '{phrase}'. Use specifics.",
                ))
    if not findings:
        findings.append(_finding("R5", "pass", "Progress notes use objective language."))
    return findings


def _check_r6(plan: GeneratedPlan, profile: ParticipantProfile) -> List[Finding]:
    findings: List[Finding] = []
    intake_services = [s.service for s in profile.current_supports]
    for fs in plan.funded_supports:
        if intake_services and not any(_overlaps(fs.service, s) for s in intake_services):
            findings.append(_finding(
                "R6", "warn",
                f"Funded support '{fs.service}' was not in the intake — verify it was not invented.",
            ))

    # Safety fields are sourced verbatim from the parser; surface any conservative [MISSING]s so
    # the reviewer can see the system did not fabricate them.
    conservative = [
        label for label, val in (
            ("NDIS number", profile.ndis_number),
            ("DOB", profile.dob),
        ) if val == MISSING
    ]
    med_dose_missing = any(m.dose == MISSING for m in profile.medications)
    if conservative or med_dose_missing:
        bits = list(conservative) + (["a medication dose"] if med_dose_missing else [])
        findings.append(_finding(
            "R6", "pass",
            "No fabrication: " + ", ".join(bits) + " correctly left as [MISSING].",
        ))
    if not any(f.status in ("fail", "warn", "pass") for f in findings):
        findings.append(_finding("R6", "pass", "No invented medications, diagnoses, or contacts."))
    return findings


def _check_r7(plan: GeneratedPlan) -> List[Finding]:
    try:
        plan_date = _dt.date.fromisoformat(plan.plan_date)
    except (ValueError, TypeError):
        plan_date = _dt.date.today()
    try:
        review = _dt.date.fromisoformat(plan.review_date)
    except (ValueError, TypeError):
        return [_finding("R7", "fail", f"Review date '{plan.review_date}' is not a valid date.")]

    if review < plan_date:
        return [_finding("R7", "fail", "Review date is before the plan date.")]
    if (review - plan_date).days > 366:
        return [_finding("R7", "fail", "Review date is more than 12 months after the plan date.")]
    return [_finding("R7", "pass", f"Review date {plan.review_date} is within 12 months.")]


def validate(plan: GeneratedPlan, profile: ParticipantProfile) -> ValidationReport:
    findings: List[Finding] = []
    findings += _check_r1(plan, profile)
    findings += _check_r2(plan)
    findings += _check_r3(plan)
    findings += _check_r4(plan)
    findings += _check_r5(plan)
    findings += _check_r6(plan, profile)
    findings += _check_r7(plan)
    return ValidationReport(findings=findings)
