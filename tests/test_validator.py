"""R1–R7 validator tests, including the three negative cases from spec §5."""
import datetime as _dt

from app.models import (
    MISSING,
    EmergencyContact,
    FundedSupport,
    GeneratedPlan,
    Goal,
    NoteEntry,
    ParticipantProfile,
    SupportStrategy,
)
from app.validator import validate


# --------------------------------------------------------------------------------------------
# builders
# --------------------------------------------------------------------------------------------
def make_profile(**overrides) -> ParticipantProfile:
    base = dict(
        name="Test Participant", dob="01/01/2000", ndis_number="430182905",
        address="1 Test St", contact="0400 000 000",
        emergency_contact=EmergencyContact(name="Pat Carer", phone="0400 111 222", relationship="parent"),
        gp="Dr Test", preferred_hospital="Test Hospital",
        living_arrangement="shared house", cultural_background=MISSING,
        communication_preferences="short sentences", likes="trains", dislikes="loud noise",
        routines="quiet mornings", primary_disability="Autism Spectrum Disorder (Level 2)",
        secondary_conditions=[], medications=[], allergies=[],
        behavioural_notes="", seizure_notes="", existing_plans=[],
        informal_supports=["Mum visits weekly"],
        stated_goals=["travel independently", "make friends", "cook simple meals"],
        current_supports=[],
    )
    base.update(overrides)
    return ParticipantProfile(**base)


def make_plan(**overrides) -> GeneratedPlan:
    today = _dt.date.today()
    base = dict(
        plan_date=today.isoformat(),
        review_date=(today + _dt.timedelta(days=180)).isoformat(),
        goals=[
            Goal(number=1, outcome_text="Travel independently to my art class and build confidence."),
            Goal(number=2, outcome_text="Build friendships and feel more connected in my community."),
            Goal(number=3, outcome_text="Prepare simple meals on my own."),
        ],
        funded_supports=[
            FundedSupport(support="Community access worker", service="support worker - community access",
                          category="Core", subcategory="Daily Living", frequency="6 hrs/week",
                          delivered_by="Support worker", goal_refs=[1, 2]),
            FundedSupport(support="Occupational therapy", service="occupational therapy",
                          category="Capacity Building", subcategory="Improved Daily Living",
                          frequency="fortnightly", delivered_by="OT", goal_refs=[3]),
        ],
        support_strategies=[SupportStrategy(support_need="Anxiety in new places", strategy="Use a visual schedule.")],
        note_entries=[
            NoteEntry(date=today.isoformat(), start_time="10:00", end_time="13:00",
                      worker_name="Sam", participant_name="Test Participant", location="Footscray",
                      support_type="Community Access",
                      supports_delivered="Travelled by train to art class; bought a ticket with one prompt.",
                      participation="Navigated the platform independently; needed one prompt for the ticket machine.",
                      observations="Engaged and calm; initiated conversation with the instructor, a change from last week.",
                      goal_ref=1, incidents="None", follow_up="Continue train-travel practice next session.",
                      worker_signoff="Sam T."),
        ],
    )
    base.update(overrides)
    return GeneratedPlan(**base)


def rule_findings(report, rule):
    return [f for f in report.findings if f.rule == rule]


def has_fail(report, rule):
    return any(f.status == "fail" for f in rule_findings(report, rule))


# --------------------------------------------------------------------------------------------
# happy path
# --------------------------------------------------------------------------------------------
def test_clean_plan_passes():
    report = validate(make_plan(), make_profile())
    assert report.passed is True
    assert not any(f.status == "fail" for f in report.findings)


# --------------------------------------------------------------------------------------------
# §5 negative tests
# --------------------------------------------------------------------------------------------
def test_r2_ot_under_core_is_flagged():
    plan = make_plan(funded_supports=[
        FundedSupport(support="OT", service="occupational therapy", category="Core",
                      subcategory="Daily Living", frequency="fortnightly",
                      delivered_by="OT", goal_refs=[1]),
    ])
    assert has_fail(validate(plan, make_profile()), "R2")


def test_r4_service_as_goal_is_flagged():
    plan = make_plan(goals=[
        Goal(number=1, outcome_text="Attend my day program."),
        Goal(number=2, outcome_text="Build friendships in my community."),
        Goal(number=3, outcome_text="Prepare simple meals on my own."),
    ])
    assert has_fail(validate(plan, make_profile()), "R4")


def test_r5_vague_note_language_is_flagged():
    plan = make_plan(note_entries=[
        NoteEntry(date="2026-06-13", start_time="10:00", end_time="12:00", worker_name="Sam",
                  participant_name="Daniel", location="home", support_type="Daily Living",
                  supports_delivered="Daniel had a good day, helped as usual.",
                  participation="as usual", observations="had a good day",
                  goal_ref=1, incidents="None", follow_up="None", worker_signoff="Sam"),
    ])
    assert has_fail(validate(plan, make_profile()), "R5")


# --------------------------------------------------------------------------------------------
# other rules
# --------------------------------------------------------------------------------------------
def test_r3_broken_goal_link_is_flagged():
    plan = make_plan(funded_supports=[
        FundedSupport(support="Worker", service="support worker", category="Core",
                      subcategory="Daily Living", frequency="weekly", delivered_by="SW", goal_refs=[99]),
    ])
    assert has_fail(validate(plan, make_profile()), "R3")


def test_r1_fewer_than_three_goals_is_flagged():
    plan = make_plan(goals=[Goal(number=1, outcome_text="Build independence in my community.")])
    assert has_fail(validate(plan, make_profile()), "R1")


def test_r7_review_date_beyond_12_months_is_flagged():
    today = _dt.date.today()
    plan = make_plan(plan_date=today.isoformat(),
                     review_date=(today + _dt.timedelta(days=400)).isoformat())
    assert has_fail(validate(plan, make_profile()), "R7")


def test_r6_missing_fields_are_not_treated_as_fabrication():
    profile = make_profile(ndis_number=MISSING)
    report = validate(make_plan(), profile)
    assert not has_fail(report, "R6")
    assert any("[MISSING]" in f.message for f in rule_findings(report, "R6"))
