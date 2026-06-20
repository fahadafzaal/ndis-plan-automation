"use client";

import { useState } from "react";
import CheckpointCard from "./CheckpointCard";
import { submitDecisions, generatePlan } from "@/lib/api";
import type { Checkpoint, GenerateResponse, Decision } from "@/types/ndis";

interface Props {
  sessionId: string;
  checkpoints: Checkpoint[];
  onGenerated: (result: GenerateResponse) => void;
}

export default function ReviewStep({ sessionId, checkpoints, onGenerated }: Props) {
  const [decisions, setDecisions] = useState<Record<string, { decision: "yes" | "no" | null; note: string }>>(() =>
    Object.fromEntries(checkpoints.map((c) => [`${c.checkpoint_id}|${c.field}`, { decision: null, note: "" }]))
  );
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  const allDecided = checkpoints.every((c) => decisions[`${c.checkpoint_id}|${c.field}`]?.decision !== null);
  const confirmedCount = Object.values(decisions).filter((d) => d.decision !== null).length;

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
        return {
          checkpoint_id: c.checkpoint_id,
          field: c.field,
          value_shown: c.value_shown,
          decision: d.decision as "yes" | "no",
          note: d.note,
        };
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Confirm each point before generating. <span className="font-semibold text-slate-800">{confirmedCount}/{checkpoints.length}</span> confirmed.
        </p>
        <div className="h-2 w-32 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(confirmedCount / checkpoints.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <button
        onClick={handleGenerate}
        disabled={!allDecided || loading}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold text-sm shadow transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating documents… ({elapsed}s)
          </>
        ) : allDecided ? (
          "Generate Documents"
        ) : (
          `Confirm all ${checkpoints.length} checkpoints to continue`
        )}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
    </div>
  );
}
