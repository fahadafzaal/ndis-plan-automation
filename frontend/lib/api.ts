import type { ParseResponse, GenerateResponse, ExportResponse, Decision } from "@/types/ndis";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

export async function getParticipants(): Promise<Record<string, string>> {
  const res = await fetch(`${BASE}/api/participants`);
  return res.json();
}

export async function parseIntake(intake_text: string): Promise<ParseResponse> {
  return post("/api/parse", { intake_text });
}

export async function submitDecisions(session_id: string, decisions: Decision[]): Promise<void> {
  await post("/api/decisions", { session_id, decisions });
}

export async function generatePlan(session_id: string): Promise<GenerateResponse> {
  return post("/api/generate", { session_id });
}

export async function exportDocuments(session_id: string): Promise<ExportResponse> {
  return post("/api/export", { session_id });
}
