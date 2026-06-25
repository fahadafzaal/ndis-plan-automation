"use client";

import { useState } from "react";
import ValidationReport from "./ValidationReport";
import DocumentViewer from "./DocumentViewer";
import { exportDocuments } from "@/lib/api";
import type { GenerateResponse, ExportFile } from "@/types/ndis";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface Props {
  sessionId: string;
  result: GenerateResponse;
  participantName: string;
}

export default function OutputStep({ sessionId, result, participantName }: Props) {
  const [exporting, setExporting] = useState(false);
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      const res = await exportDocuments(sessionId);
      setFiles(res.files);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const docCount = Object.keys(result.documents).length;

  return (
    <div>
      {/* Step header */}
      <div className="px-6 py-5 border-b border-slate-100" style={{ background: "linear-gradient(to right, #f0fdf4, #ecfdf5)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Generated Documents — {participantName}</h2>
            <p className="text-xs text-slate-500">{docCount} documents ready · Review before exporting</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-4">
          {[
            { label: "Documents", value: docCount, color: "text-emerald-600" },
            { label: "Rules passed", value: result.report.filter((f) => f.status === "pass").length, color: "text-blue-600" },
            { label: "Excluded fields", value: result.excluded.length, color: result.excluded.length > 0 ? "text-amber-600" : "text-slate-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 text-center min-w-[80px]">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Validation */}
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">R</span>
            Validation Report
          </h3>
          <ValidationReport findings={result.report} passed={result.passed} />
        </section>

        {/* Excluded fields */}
        {result.excluded.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Fields excluded by human review</p>
              <ul className="space-y-0.5">
                {result.excluded.map((e, i) => (
                  <li key={i} className="text-xs text-amber-700">• {e}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Documents */}
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">D</span>
            Generated Documents
          </h3>
          <DocumentViewer documents={result.documents} />
        </section>

        {/* Export */}
        <section className="border-t border-slate-100 pt-6">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #1e293b, #334155)", color: "white" }}
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Markdown + PDF
              </>
            )}
          </button>

          {exportError && (
            <div className="mt-3 flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{exportError}</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Downloaded files</p>
              <div className="space-y-2">
                {files.map((f) =>
                  f.url ? (
                    <a
                      key={f.name}
                      href={`${API_BASE}${f.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="text-sm text-blue-600 group-hover:text-blue-800 font-medium">{f.name}</span>
                    </a>
                  ) : (
                    <div key={f.name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-slate-200">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-slate-500">{f.name}</span>
                      <span className="ml-auto text-xs text-slate-400">{f.detail}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
