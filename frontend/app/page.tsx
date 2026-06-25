"use client";

import { useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import IntakeStep from "@/components/IntakeStep";
import ReviewStep from "@/components/ReviewStep";
import OutputStep from "@/components/OutputStep";
import type { ParseResponse, GenerateResponse } from "@/types/ndis";

export default function Home() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(null);

  function handleParsed(result: ParseResponse) {
    setParseResult(result);
    setGenerateResult(null);
    setStep(1);
  }

  function handleGenerated(result: GenerateResponse) {
    setGenerateResult(result);
    setStep(2);
  }

  function reset() {
    setStep(0);
    setParseResult(null);
    setGenerateResult(null);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)" }} className="shadow-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">NDIS Plan Automation</h1>
              <p className="text-blue-200 text-xs">AI-assisted drafting · Human oversight required</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-400/20 border border-amber-300/40 text-amber-100 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />
              Synthetic data only
            </span>
            {step > 0 && (
              <button
                onClick={reset}
                className="text-xs text-blue-200 hover:text-white border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-lg transition-all"
              >
                ← Start over
              </button>
            )}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <StepIndicator current={step} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {step === 0 && <IntakeStep onParsed={handleParsed} />}
          {step === 1 && parseResult && (
            <ReviewStep
              sessionId={parseResult.session_id}
              checkpoints={parseResult.checkpoints}
              profile={parseResult.profile}
              onGenerated={handleGenerated}
            />
          )}
          {step === 2 && generateResult && parseResult && (
            <OutputStep
              sessionId={parseResult.session_id}
              result={generateResult}
              participantName={parseResult.profile.name}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap gap-3 items-center justify-between">
          <p className="text-xs text-slate-400">
            Drafting aid only — not a clinical decision-maker. Human review required for all care and funding decisions.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>NDIS Practice Standards</span>
            <span>·</span>
            <span>7-year record retention</span>
            <span>·</span>
            <span>Australian Privacy Act</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
