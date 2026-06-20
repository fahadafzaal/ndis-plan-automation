"use client";

import { useState, useEffect } from "react";
import { getParticipants, parseIntake } from "@/lib/api";
import type { ParseResponse } from "@/types/ndis";

interface Props {
  onParsed: (result: ParseResponse) => void;
}

export default function IntakeStep({ onParsed }: Props) {
  const [text, setText] = useState("");
  const [participants, setParticipants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    getParticipants().then(setParticipants).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  async function handleParse() {
    if (!text.trim()) { setError("Paste some intake text first."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await parseIntake(text);
      onParsed(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-700">Participant Intake Notes</label>
          <div className="flex gap-2">
            {Object.keys(participants).map((k) => (
              <button
                key={k}
                onClick={() => setText(participants[k])}
                className="px-3 py-1 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              >
                Load {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste free-text participant intake notes here…"
          rows={12}
          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm transition"
        />
        <p className="mt-1 text-xs text-slate-400">
          {text.length > 0 ? `${text.length} characters` : "Use Load A / B / C for demo data"}
        </p>
      </div>

      <button
        onClick={handleParse}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm shadow transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Parsing with AI… ({elapsed}s)
          </>
        ) : (
          "Parse Intake"
        )}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
