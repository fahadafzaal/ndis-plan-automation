"use client";

import { useState } from "react";
import CheckpointCard from "./CheckpointCard";
import { submitDecisions, generatePlan } from "@/lib/api";
import type { Checkpoint, GenerateResponse, Decision, ParticipantProfile } from "@/types/ndis";

interface Props {
  sessionId: string;
  checkpoints: Checkpoint[];
  profile: ParticipantProfile;
  onGenerated: (result: GenerateResponse) => void;
}

export default function ReviewStep({ sessionId, checkpoints, profile, onGenerated }: Props) {
  const [decisions, setDecisions] = useState<Record<string, { decision: "yes" | "no" | null; note: string }>>(() =>
    Object.fromEntries(checkpoints.map((c) => [`${c.checkpoint_id}|${c.field}`, { decision: null, note: "" }]))
  );
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const confirmedCount = Object.values(decisions).filter((d) => d.decision !== null).length;
  const allDecided = confirmedCount === checkpoints.length;
  const progress = checkpoints.length > 0 ? (confirmedCount / checkpoints.length) * 100 : 0;

  function setDecision(key: string, value: "yes" | "no") {
    setDecisions((prev) => ({ ...prev, [key]: { ...prev[key], decision: value } }));
  }
  function setNote(key: string, note: string) {
    setDecisions((prev) => ({ ...prev, [key]: { ...prev[key], note } }));
  }

  async function handleGenerate() {
    setError("");
    setLoading(true);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      const decisionList: Decision[] = checkpoints.map((c) => {
        const k = `${c.checkpoint_id}|${c.field}`;
        const d = decisions[k];
        return { checkpoint_id: c.checkpoint_id, field: c.field, value_shown: c.value_shown, decision: d.decision as "yes" | "no", note: d.note };
      });
      await submitDecisions(sessionId, decisionList);
      const result = await generatePlan(sessionId);
      onGenerated(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      clearInterval(id);
      setLoading(false);
      setElapsed(0);
    }
  }

  return (
    <div>
      {/* Step header */}
      <div className="px-6 py-5 border-b border-slate-100" style={{ background: "linear-gradient(to right, #f8faff, #f0f4ff)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Human Review — {profile.name}</h2>
              <p className="text-xs text-slate-500">Confirm or flag each critical data point before generating documents</p>
            </div>
          </div>
          {/* Progress */}
          <div className="text-right shrink-0">
            <span className="text-2xl font-bold text-slate-800">{confirmedCount}</span>
            <span className="text-sm text-slate-400">/{checkpoints.length}</span>
            <p className="text-xs text-slate-500">reviewed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: allDecided ? "linear-gradient(90deg, #059669, #10b981)" : "linear-gradient(90deg, #2563eb, #60a5fa)" }}
          />
        </div>
        {allDecided && (
          <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            All checkpoints reviewed — ready to generate
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Checkpoint grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checkpoints.map((c) => {
            const k = `${c.checkpoint_id}|${c.field}`;
            return (
              <CheckpointCard
                key={k}
                checkpoint={c}
                decision={decisions[k]?.decision ?? null}
                note={decisions[k]?.note ?? ""}
                onDecide={(v) => setDecision(k, v)}
                onNote={(n) => setNote(k, n)}
              />
            );
          })}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!allDecided || loading}
          className="w-full py-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: allDecided && !loading
              ? "linear-gradient(135deg, #059669, #047857)"
              : "#e2e8f0",
            color: allDecided && !loading ? "white" : "#94a3b8",
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating NDIS documents… {elapsed > 0 && `(${elapsed}s)`}
            </>
          ) : allDecided ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate NDIS Documents
            </>
          ) : (
            `Review all ${checkpoints.length} checkpoints to continue (${checkpoints.length - confirmedCount} remaining)`
          )}
        </button>

        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
