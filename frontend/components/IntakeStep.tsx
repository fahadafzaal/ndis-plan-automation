"use client";

import { useState, useEffect } from "react";
import { getParticipants, parseIntake } from "@/lib/api";
import type { ParseResponse } from "@/types/ndis";

const SAMPLE_META: Record<string, { name: string; disability: string; color: string }> = {
  a: { name: "Liam Carter", disability: "Autism Spectrum Disorder", color: "from-violet-500 to-purple-600" },
  b: { name: "Maria Santos", disability: "Multiple Sclerosis", color: "from-rose-500 to-pink-600" },
  c: { name: "Jordan Blake", disability: "Acquired Brain Injury", color: "from-amber-500 to-orange-600" },
};

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
    if (!text.trim()) { setError("Paste some intake notes first."); return; }
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
    <div>
      {/* Step header */}
      <div className="px-6 py-5 border-b border-slate-100" style={{ background: "linear-gradient(to right, #f8faff, #f0f4ff)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Participant Intake</h2>
            <p className="text-xs text-slate-500">Paste free-text notes and the AI will extract a structured profile</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Sample participants */}
        {Object.keys(participants).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo Participants</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.keys(participants).map((k) => {
                const meta = SAMPLE_META[k];
                return (
                  <button
                    key={k}
                    onClick={() => setText(participants[k])}
                    className={`relative overflow-hidden rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md bg-gradient-to-br ${meta?.color ?? "from-slate-500 to-slate-600"}`}
                  >
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                      {k.toUpperCase()}
                    </div>
                    <div className="text-white font-semibold text-sm">{meta?.name ?? `Participant ${k.toUpperCase()}`}</div>
                    <div className="text-white/70 text-xs mt-0.5">{meta?.disability ?? "Load intake"}</div>
                    <div className="mt-2 text-white/50 text-[10px]">Click to load →</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Intake Notes</label>
            <span className="text-xs text-slate-400">{text.length > 0 ? `${text.length} characters` : "or paste your own"}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste free-text participant intake notes here…&#10;&#10;e.g. Name, DOB, NDIS number, disability, goals, current supports, medications, emergency contact…"
            rows={10}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition focus:bg-white"
          />
        </div>

        {/* Parse button */}
        <button
          onClick={handleParse}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ background: loading ? "#93c5fd" : "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white" }}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Parsing with AI… {elapsed > 0 && `(${elapsed}s)`}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Parse Intake with AI
            </>
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
