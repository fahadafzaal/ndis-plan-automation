"""R2 funding-category classification tests (spec §3.1 / §5)."""
from app.funding_rules import classify_support


def test_support_worker_and_personal_care_are_core_daily_living():
    for service in ["support worker", "personal care", "community access", "household tasks", "transport"]:
        cls = classify_support(service)
        assert cls.category == "Core"
        assert cls.subcategory == "Daily Living"
        assert not cls.ambiguous


def test_therapy_is_capacity_building_improved_daily_living():
    for service in ["occupational therapy", "physiotherapy", "psychology", "speech therapy", "dietitian"]:
        cls = classify_support(service)
        assert cls.category == "Capacity Building"
        assert cls.subcategory == "Improved Daily Living"


def test_support_coordination_is_capacity_building():
    cls = classify_support("support coordination")
    assert cls.category == "Capacity Building"
    assert cls.subcategory == "Support Coordination"


def test_high_cost_and_item_specific_are_capital():
    for service in ["power wheelchair", "AAC communication device", "ceiling hoist",
                    "home modification", "vehicle modification"]:
        assert classify_support(service).category == "Capital"


def test_item_over_threshold_is_capital_via_cost():
    assert classify_support("specialised equipment", cost=2300).category == "Capital"
    assert classify_support("equipment costing $2,300").category == "Capital"


def test_consumable_under_threshold_is_core_consumables():
    cls = classify_support("continence consumables")
    assert cls.category == "Core"
    assert cls.subcategory == "Consumables"


def test_unknown_support_is_flagged_for_review():
    cls = classify_support("astrology coaching")
    assert cls.ambiguous is True
