---
title: NDIS Plan Automation
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# NDIS Plan Automation MVP

A small **local** agentic system that turns free-text NDIS participant intake into 2–3
compliant provider documents, routing every safety- and funding-critical decision through a
human (Yes/No) before files are finalised.

Pipeline:

```
intake text → Intake Parser (LLM) → structured profile (JSON, [MISSING] for absent fields)
            → human checkpoint (C1–C7 Yes/No) → Plan Generator (LLM) → structured plan
            → Validator (deterministic R1–R7) → Markdown + PDF export
            → Risk & Consent sheet built from the actual Yes/No clicks
```

## What it produces

1. **Care / Support Plan** — the main deliverable (participant details, about-me, disability &
   health, informal supports, numbered outcome goals, funded supports with the correct funding
   category + goal linkage, support strategies, review date).
2. **Progress / Shift Note logbook** — template plus 1–2 pre-filled example entries using the
   8-element structure, each referencing a goal number.
3. **Risk & Consent summary** — the human-oversight artifact: every critical point the worker
   confirmed, with their Yes/No, timestamp, and note.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env          # then edit .env and paste your OPENCODE_API_KEY
python run.py                 # open http://127.0.0.1:8000
```

Uses **OpenCode Go** (OpenAI-compatible gateway), model **`glm-5.1`** by default, for the two LLM
agents. The validator is plain deterministic Python — no LLM. The provider is configured by env
vars (`OPENCODE_API_KEY`, `NDIS_BASE_URL`, `NDIS_MODEL`), so any OpenAI-compatible gateway —
including **Wafer** — works as a drop-in by changing those three values (see `.env.example`).

## Using the dashboard

1. Paste intake text (or click **Load A / B / C** for the three synthetic test participants).
2. **Parse** → review the structured profile and the stack of **C1–C7 critical cards**.
3. Click **Yes / No** on each card (add a note if needed). A **No** flags and *excludes* that
   field — it will not silently flow into the final documents.
4. **Generate** → see the 3 draft documents and the validator report (green ticks / red flags).
5. **Approve & Export** → writes `.md` and `.pdf` files to `exports/` and the Risk & Consent
   sheet from your Yes/No log.

## Tests

```bash
pytest
```

`tests/test_funding_rules.py` covers the R2 funding-category table; `tests/test_validator.py`
covers R1–R7 and the three negative cases from the spec (vague note language → R5, a
service-as-goal → R4, OT placed under Core → R2).

## Important caveats

- **Synthetic data only.** The three bundled participants are fictional. Real use would require
  privacy/consent handling under the Australian **Privacy Act** and **NDIS Practice Standards**
  record-keeping (**7-year retention**). Do not put real participant data into this MVP.
- **This is a drafting aid, not a decision-maker.** The human Yes/No gates are the point: the
  provider's support worker stays accountable for clinical and funding decisions.
- **The NDIS does not mandate one note format.** It mandates complete, accurate, contemporaneous
  records that justify each claim and link to goals. These structures are a sensible default,
  not the only legal format.
- **Funding-category logic is the common-case version.** Real plans can have flexible funding
  and exceptions, so the validator **flags for human review** rather than hard-blocking.

## Implementation notes

- The Plan Generator returns a **structured** plan object; the validator runs on that object and
  the Markdown is rendered deterministically from it, so the validated content is exactly what
  gets exported.
- The LLM layer (`app/llm.py`) is provider-agnostic: it calls any OpenAI-compatible gateway via
  the `openai` SDK using **JSON mode**, validates the reply against the Pydantic schema, and does
  one corrective retry if validation fails. Switching from OpenCode Go to Wafer (or any other
  OpenAI-compatible endpoint) is purely an env-var change — no code change.
- **No fabrication (R6):** the parser is instructed to emit the literal string `[MISSING]` for
  absent required fields and never to infer medications, diagnoses, doses, allergies, or
  contacts. The validator additionally cross-checks generated content against the parsed profile.
- `temperature` is set to `0.2` for consistency (the open models on OpenCode Go accept it).
- Every model request/response is logged to `logs/` for debugging the validator.
