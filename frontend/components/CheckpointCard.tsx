"use client";

import type { Checkpoint } from "@/types/ndis";

const ID_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  C1: { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: "🧠" },
  C2: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: "💊" },
  C3: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: "⚠️" },
  C4: { color: "text-red-700",    bg: "bg-red-50 border-red-200",    icon: "📋" },
  C5: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "🎯" },
  C6: { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: "💰" },
  C7: { color: "text-pink-700",   bg: "bg-pink-50 border-pink-200",   icon: "📞" },
};

interface Props {
  checkpoint: Checkpoint;
  decision: "yes" | "no" | null;
  note: string;
  onDecide: (d: "yes" | "no") => void;
  onNote: (n: string) => void;
}

export default function CheckpointCard({ checkpoint, decision, note, onDecide, onNote }: Props) {
  const cfg = ID_CONFIG[checkpoint.checkpoint_id] ?? { color: "text-slate-700", bg: "bg-slate-50 border-slate-200", icon: "📌" };

  return (
    <div
      className={`rounded-2xl border-2 bg-white transition-all duration-200 overflow-hidden ${
        decision === "yes"
          ? "border-emerald-400 shadow-md shadow-emerald-50"
          : decision === "no"
          ? "border-red-400 shadow-md shadow-red-50"
          : "border-slate-200 hover:border-slate-300 shadow-sm"
      }`}
    >
      {/* Status bar */}
      <div className={`h-1 w-full transition-all duration-300 ${decision === "yes" ? "bg-emerald-400" : decision === "no" ? "bg-red-400" : "bg-transparent"}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center text-base ${cfg.bg}`}>
            {cfg.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${cfg.color}`}>{checkpoint.checkpoint_id}</span>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                {checkpoint.field.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800 mt-1 leading-snug break-words">
              {checkpoint.value_shown}
            </p>
          </div>
        </div>

        {/* Why */}
        <p className="text-xs text-slate-500 leading-relaxed mb-4 pl-12">
          {checkpoint.why}
        </p>

        {/* Decision buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => onDecide("yes")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 flex items-center justify-center gap-1.5 ${
              decision === "yes"
                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Confirm
          </button>
          <button
            onClick={() => onDecide("no")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 flex items-center justify-center gap-1.5 ${
              decision === "no"
                ? "bg-red-500 border-red-500 text-white shadow-sm"
                : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Flag / No
          </button>
        </div>

        {/* Note */}
        <input
          type="text"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Add a note (optional)…"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition"
        />
      </div>
    </div>
  );
}
