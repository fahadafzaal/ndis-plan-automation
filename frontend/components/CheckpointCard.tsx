"use client";

import type { Checkpoint } from "@/types/ndis";

const ID_COLORS: Record<string, string> = {
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-orange-100 text-orange-700",
  C3: "bg-yellow-100 text-yellow-700",
  C4: "bg-red-100 text-red-700",
  C5: "bg-green-100 text-green-700",
  C6: "bg-blue-100 text-blue-700",
  C7: "bg-pink-100 text-pink-700",
};

interface Props {
  checkpoint: Checkpoint;
  decision: "yes" | "no" | null;
  note: string;
  onDecide: (d: "yes" | "no") => void;
  onNote: (n: string) => void;
}

export default function CheckpointCard({ checkpoint, decision, note, onDecide, onNote }: Props) {
  const color = ID_COLORS[checkpoint.checkpoint_id] ?? "bg-slate-100 text-slate-700";
  return (
    <div
      className={`rounded-xl border bg-white shadow-sm p-4 transition-all ${
        decision === "yes"
          ? "border-green-300 ring-1 ring-green-200"
          : decision === "no"
          ? "border-red-300 ring-1 ring-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
          {checkpoint.checkpoint_id}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {checkpoint.field.replace(/_/g, " ")}
          </p>
          <p className="text-sm text-slate-800 mt-0.5 break-words">{checkpoint.value_shown}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 italic mb-3 leading-relaxed">{checkpoint.why}</p>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => onDecide("yes")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
            decision === "yes"
              ? "bg-green-600 border-green-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-green-50 hover:border-green-400 hover:text-green-700"
          }`}
        >
          ✓ Yes
        </button>
        <button
          onClick={() => onDecide("no")}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
            decision === "no"
              ? "bg-red-600 border-red-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
          }`}
        >
          ✗ No
        </button>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Optional note…"
        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}
