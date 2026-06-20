"use client";

import { useState } from "react";

const TABS: { key: string; label: string }[] = [
  { key: "care-plan", label: "Care / Support Plan" },
  { key: "progress-notes", label: "Progress Notes" },
  { key: "risk-consent", label: "Risk & Consent" },
];

interface Props {
  documents: Record<string, string>;
}

export default function DocumentViewer({ documents }: Props) {
  const [active, setActive] = useState("care-plan");

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              active === t.key
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 max-h-[500px] overflow-y-auto">
        <pre className="doc-content text-slate-700">{documents[active] ?? ""}</pre>
      </div>
    </div>
  );
}
