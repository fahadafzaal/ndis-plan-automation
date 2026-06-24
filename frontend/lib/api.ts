import type { ParseResponse, GenerateResponse, ExportResponse, Decision } from "@/types/ndis";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const MOCK = process.env.NEXT_PUBLIC_MOCK === "true";

// ---------------------------------------------------------------------------
// Mock data — used when NEXT_PUBLIC_MOCK=true
// ---------------------------------------------------------------------------
const MOCK_PARTICIPANTS: Record<string, string> = {
  a: "Liam Carter, DOB 14/03/2001, NDIS #430182905. Lives in a shared house in Footscray VIC. Likes trains, drawing, quiet spaces. Primary disability: Autism Spectrum Disorder (Level 2). Support worker 6 hrs/week community access; OT fortnightly.",
  b: "Maria Santos, DOB 22/07/1985, NDIS #512309871. Lives alone in Richmond VIC. Primary disability: Multiple Sclerosis. Uses power wheelchair. Physiotherapy weekly, personal care daily.",
  c: "Jordan Blake, DOB [MISSING], NDIS [MISSING]. Primary disability: Acquired Brain Injury. Support coordination required.",
};

const MOCK_PARSE: ParseResponse = {
  session_id: "mock-session-001",
  profile: {
    name: "Liam Carter",
    dob: "2001-03-14",
    ndis_number: "430182905",
    primary_disability: "Autism Spectrum Disorder (Level 2)",
    secondary_conditions: [],
    medications: [],
    allergies: [],
    behavioural_support_plan: "No BSP in place",
    seizure_management_plan: "[MISSING]",
    communication_needs: "Verbal; prefers short sentences and visual schedules",
    mobility_needs: "Independent",
    informal_supports: ["Mum (Sarah Carter) visits weekly"],
    emergency_contact: { name: "Sarah Carter", phone: "0400 111 222" },
    stated_goals: [
      "Travel independently on the train to art class",
      "Make a couple of friends",
      "Cook two simple meals on his own",
    ],
    current_supports: [
      { service: "support worker", frequency: "6 hrs/week", raw: "support worker 6 hrs/week community access" },
      { service: "occupational therapy", frequency: "fortnightly", raw: "OT fortnightly for daily-living skills" },
    ],
    funding_level: "[MISSING]",
    plan_start_date: new Date().toISOString().split("T")[0],
  },
  checkpoints: [
    { checkpoint_id: "C1", field: "primary_disability", value_shown: "Autism Spectrum Disorder (Level 2)", why: "Confirm the primary disability is correctly identified before planning." },
    { checkpoint_id: "C2", field: "medications", value_shown: "None reported", why: "Confirm no medications are in use or that the list is complete." },
    { checkpoint_id: "C3", field: "allergies", value_shown: "None reported", why: "Confirm no known allergies before care planning." },
    { checkpoint_id: "C4", field: "behavioural_support_plan", value_shown: "No BSP in place", why: "Confirm behavioural / seizure plan status before generating documents." },
    { checkpoint_id: "C5", field: "stated_goals", value_shown: "1. Travel independently on the train to art class\n2. Make a couple of friends\n3. Cook two simple meals on his own", why: "Confirm these are the participant's own stated goals." },
    { checkpoint_id: "C6", field: "current_supports", value_shown: "support worker → Core (Daily Living) | 6 hrs/week\noccupational therapy → Capacity Building (Improved Daily Living) | fortnightly", why: "Confirm each support and its funding category before generating the plan." },
    { checkpoint_id: "C7", field: "emergency_contact", value_shown: "Sarah Carter — 0400 111 222", why: "Confirm emergency contact details are accurate." },
  ],
};

const MOCK_GENERATE: GenerateResponse = {
  documents: {
    "care-plan": `# NDIS Care Plan — Liam Carter

**NDIS Number:** 430182905
**Date of Birth:** 14 March 2001
**Plan Date:** ${new Date().toISOString().split("T")[0]}
**Review Date:** ${new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]}

---

## About Me

Liam lives in a shared house in Footscray with two housemates. He communicates verbally and prefers short sentences and visual schedules. He enjoys trains, drawing, and quiet spaces, and finds loud unexpected noise and crowds challenging.

**Emergency Contact:** Sarah Carter (Mother) — 0400 111 222
**GP:** Dr Nguyen, Footscray Family Clinic

---

## Goals

**Goal 1:** Liam will travel independently on public transport to his weekly art class within 6 months.

**Goal 2:** Liam will build social connections by joining a community group and developing two new friendships within 12 months.

**Goal 3:** Liam will prepare two simple meals independently at least twice per week within 6 months.

---

## Funded Supports

| Support | Category | Frequency | Delivered By | Goals |
|---|---|---|---|---|
| Community Access Support Worker | Core — Daily Living | 6 hrs/week | Registered support worker | 1, 2, 3 |
| Occupational Therapy | Capacity Building — Improved Daily Living | Fortnightly | Registered OT | 1, 3 |

---

## Support Strategies

- **Independent travel:** Use visual schedules and practice train routes with worker before solo travel.
- **Anxiety in new places:** Preview new locations via photos/video; arrive early with support worker present first time.
- **Meal preparation:** Worker provides step-by-step visual recipe cards; Liam completes tasks independently with verbal prompts only.
`,
    "progress-notes": `# Progress Notes — Liam Carter

**NDIS Number:** 430182905

---

## Session Note

**Date:** ${new Date().toISOString().split("T")[0]}
**Start:** 10:00 | **End:** 12:00
**Worker:** [Worker Name]
**Location:** Footscray Train Station / Community
**Support Type:** Community Access

**Supports Delivered:**
Practised train route to Flinders Street; purchased ticket independently; navigated to platform with minimal prompting.

**Participation:**
Liam initiated ticket purchase, identified correct platform, and maintained composure in a busy station environment.

**Observations:**
Liam appeared calm and focused throughout; only required one verbal prompt when platform changed. Demonstrated improved confidence compared to previous session.

**Goal:** Goal 1 — Independent public transport travel
**Incidents:** None
**Follow-up:** Schedule solo trial run next session with worker observing from a distance.

**Worker Sign-off:** [Worker Name] — Support Worker
`,
    "risk-consent": `# Risk Assessment & Consent Record — Liam Carter

**NDIS Number:** 430182905
**Generated:** ${new Date().toISOString().split("T")[0]}

---

## Human Oversight Record (C1–C7)

| ID | Field | Value Confirmed | Decision | Reviewer | Timestamp |
|---|---|---|---|---|---|
| C1 | Primary disability | Autism Spectrum Disorder (Level 2) | YES | Support Worker | ${new Date().toISOString()} |
| C2 | Medications | None reported | YES | Support Worker | ${new Date().toISOString()} |
| C3 | Allergies | None reported | YES | Support Worker | ${new Date().toISOString()} |
| C4 | Behavioural plan | No BSP in place | YES | Support Worker | ${new Date().toISOString()} |
| C5 | Stated goals | 3 goals confirmed | YES | Support Worker | ${new Date().toISOString()} |
| C6 | Funded supports | 2 supports confirmed | YES | Support Worker | ${new Date().toISOString()} |
| C7 | Emergency contact | Sarah Carter 0400 111 222 | YES | Support Worker | ${new Date().toISOString()} |

---

## Consent

This document was generated as a drafting aid only. All clinical and funding decisions require human review. This is synthetic/demo data — not a real participant record.

*NDIS Practice Standards · Australian Privacy Act · 7-year record retention*
`,
  },
  report: [
    { rule: "R1", status: "pass", message: "All mandatory fields present." },
    { rule: "R2", status: "pass", message: "All funded supports correctly categorised." },
    { rule: "R3", status: "pass", message: "All goal references are valid." },
    { rule: "R4", status: "pass", message: "No goals reference a specific service/provider." },
    { rule: "R5", status: "pass", message: "No vague progress note phrases detected." },
    { rule: "R6", status: "pass", message: "No fabricated medications, diagnoses, or contacts." },
    { rule: "R7", status: "pass", message: "Review date is within 12 months of plan date." },
  ],
  passed: true,
  excluded: [],
};

const MOCK_EXPORT: ExportResponse = {
  files: [
    { name: "care-plan.md", url: null, detail: "Mock mode — no file written" },
    { name: "progress-notes.md", url: null, detail: "Mock mode — no file written" },
    { name: "risk-consent.md", url: null, detail: "Mock mode — no file written" },
  ],
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Public API — falls back to mock when NEXT_PUBLIC_MOCK=true
// ---------------------------------------------------------------------------
export async function getParticipants(): Promise<Record<string, string>> {
  if (MOCK) return MOCK_PARTICIPANTS;
  const res = await fetch(`${BASE}/api/participants`);
  return res.json();
}

export async function parseIntake(intake_text: string): Promise<ParseResponse> {
  if (MOCK) { await sleep(1200); return MOCK_PARSE; }
  return post("/api/parse", { intake_text });
}

export async function submitDecisions(session_id: string, decisions: Decision[]): Promise<void> {
  if (MOCK) { await sleep(300); return; }
  await post("/api/decisions", { session_id, decisions });
}

export async function generatePlan(session_id: string): Promise<GenerateResponse> {
  if (MOCK) { await sleep(2000); return MOCK_GENERATE; }
  return post("/api/generate", { session_id });
}

export async function exportDocuments(session_id: string): Promise<ExportResponse> {
  if (MOCK) { await sleep(500); return MOCK_EXPORT; }
  return post("/api/export", { session_id });
}
