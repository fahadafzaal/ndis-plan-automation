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

  const STEP_TITLES = [
    { title: "Participant Intake", subtitle: "Paste or load intake notes for the AI to parse" },
    { title: "Human Review", subtitle: "Confirm each critical data point before generating" },
    { title: "Generated Documents", subtitle: "Review, validate, and export the care documents" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">NDIS Plan Automation</h1>
              <p className="text-xs text-slate-500 hidden sm:block">AI-assisted drafting with human oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Synthetic data only
            </span>
            {step > 0 && (
              <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline">
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Step indicator */}
        <div className="flex justify-center">
          <StepIndicator current={step} />
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-900">{STEP_TITLES[step].title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{STEP_TITLES[step].subtitle}</p>
          </div>
          <div className="px-6 py-6">
            {step === 0 && <IntakeStep onParsed={handleParsed} />}
            {step === 1 && parseResult && (
              <ReviewStep
                sessionId={parseResult.session_id}
                checkpoints={parseResult.checkpoints}
                onGenerated={handleGenerated}
              />
            )}
            {step === 2 && generateResult && parseResult && (
              <OutputStep sessionId={parseResult.session_id} result={generateResult} />
            )}
          </div>
        </div>

        {/* Profile panel — visible in step 1+ */}
        {parseResult && step >= 1 && (
          <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-slate-700 hover:bg-slate-50 select-none">
              Parsed Profile — {parseResult.profile.name}
            </summary>
            <div className="px-6 pb-5">
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-xl p-4 overflow-x-auto max-h-64">
                {JSON.stringify(parseResult.profile, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-xs text-slate-400">
            Drafting aid only — not a decision-maker. Human review required for all clinical and funding decisions.
          </p>
          <p className="text-xs text-slate-400">NDIS Practice Standards · 7-year record retention · Australian Privacy Act</p>
        </div>
      </footer>
    </div>
  );
}
