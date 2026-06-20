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
}

export default function OutputStep({ sessionId, result }: Props) {
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Validation Report</h3>
        <ValidationReport findings={result.report} passed={result.passed} />
      </div>

      {result.excluded.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-1">Fields excluded by human review:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {result.excluded.map((e, i) => (
              <li key={i} className="text-xs text-amber-700">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Generated Documents</h3>
        <DocumentViewer documents={result.documents} />
      </div>

      <div className="border-t border-slate-200 pt-5">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold text-sm shadow transition-colors flex items-center justify-center gap-2"
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
            "Export Markdown + PDF"
          )}
        </button>

        {exportError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{exportError}</div>
        )}

        {files.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-2">Exported files:</p>
            <div className="space-y-1">
              {files.map((f) =>
                f.url ? (
                  <a
                    key={f.name}
                    href={`${API_BASE}${f.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>↓</span> {f.name}
                  </a>
                ) : (
                  <span key={f.name} className="text-sm text-slate-500">{f.name}</span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
