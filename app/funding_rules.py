"""Deterministic NDIS funding-category classification (spec rule R2).

This is the common-case version of the funding logic. Per the spec's caveats, an unrecognised
support is flagged for human review (``ambiguous=True``) rather than hard-blocked.

Mapping (R2):
  - support worker / personal care / community access / household / transport  -> Core (Daily Living)
  - OT / physio / psychology / speech / dietitian                              -> Capacity Building (Improved Daily Living)
  - support coordination                                                       -> Capacity Building (Support Coordination)
  - wheelchair / comms (AAC) device / home·vehicle mod / item > $1,500         -> Capital
  - consumable item < $1,500                                                   -> Core (Consumables)
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

CAPITAL_THRESHOLD = 1500.0


@dataclass(frozen=True)
class Classification:
    category: str  # "Core" | "Capacity Building" | "Capital"
    subcategory: str
    reason: str
    ambiguous: bool = False


# Keyword tables. Order of evaluation below is significant (most specific first).
_SUPPORT_COORDINATION = ("support coordination", "support coordinator")

_THERAPY = (
    "occupational therap", "ot ", "physiotherap", "physio", "psycholog",
    "speech", "dietit", "therapist", "therapy",
)

_CAPITAL = (
    "wheelchair", "aac", "communication device", "comms device", "hoist",
    "home modification", "vehicle modification", "home mod", "vehicle mod",
    "assistive technology", "assistive tech", "ramp", "prosthe", "orthotic",
)

_CORE_DAILY_LIVING = (
    "support worker", "personal care", "community access", "household",
    "domestic", "transport", "daily living", "daily-living", "meal", "transfer",
    "respite", "cleaning", "shopping",
)

_CONSUMABLE = ("consumable", "continence", "low cost aid", "low-cost aid")


def _extract_cost(text: str) -> Optional[float]:
    """Pull the first dollar amount out of free text, e.g. '$2,300' -> 2300.0."""
    m = re.search(r"\$\s?([\d,]+(?:\.\d+)?)", text)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def classify_support(service: str, cost: Optional[float] = None) -> Classification:
    """Classify a support/service into its NDIS funding category.

    ``service`` may be a short keyword or a free-text phrase; ``cost`` is an optional dollar
    amount (used for the Capital vs Core-consumable threshold).
    """
    text = (service or "").lower().strip()
    if cost is None:
        cost = _extract_cost(text)

    if not text:
        return Classification(
            "Core", "Daily Living", "Empty support description — needs human review.",
            ambiguous=True,
        )

    # 1. Support coordination is always Capacity Building.
    if any(k in text for k in _SUPPORT_COORDINATION):
        return Classification(
            "Capacity Building", "Support Coordination",
            "Support coordination is always Capacity Building (Support Coordination).",
        )

    # 2. Therapy / allied health -> Capacity Building (Improved Daily Living).
    if any(k in text for k in _THERAPY):
        return Classification(
            "Capacity Building", "Improved Daily Living",
            "Therapy (OT/physio/psych/speech/dietitian) is Capacity Building "
            "(Improved Daily Living), not Core.",
        )

    # 3. High-cost / item-specific supports -> Capital.
    if any(k in text for k in _CAPITAL):
        return Classification(
            "Capital", "Assistive Technology / Modifications",
            "Wheelchairs, comms devices, hoists and home/vehicle modifications are Capital.",
        )
    if cost is not None and cost > CAPITAL_THRESHOLD:
        return Classification(
            "Capital", "Assistive Technology",
            f"Item over ${CAPITAL_THRESHOLD:,.0f} is Capital.",
        )

    # 4. Consumables under threshold -> Core (Consumables).
    if any(k in text for k in _CONSUMABLE):
        return Classification(
            "Core", "Consumables",
            f"Consumable item under ${CAPITAL_THRESHOLD:,.0f} is Core (Consumables).",
        )

    # 5. Everyday support work -> Core (Daily Living).
    if any(k in text for k in _CORE_DAILY_LIVING):
        return Classification(
            "Core", "Daily Living",
            "Support workers / personal care / community access / household are Core "
            "(Daily Living).",
        )

    # 6. Unknown -> flag for human review (do not hard-block).
    return Classification(
        "Core", "Daily Living",
        f"Could not confidently classify '{service}' — flagged for human review.",
        ambiguous=True,
    )
