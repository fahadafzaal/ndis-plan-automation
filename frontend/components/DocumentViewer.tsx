"use client";

import { useState } from "react";

const TABS: { key: string; label: string; icon: string }[] = [
  { key: "care-plan", label: "Care & Support Plan", icon: "📄" },
  { key: "progress-notes", label: "Progress Notes", icon: "📝" },
  { key: "risk-consent", label: "Risk & Consent", icon: "🛡️" },
];

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^\|(.+)\|$/gm, (row) => {
      const isHeader = row.includes("---|");
      if (isHeader) return "";
      const cells = row.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
      return `<tr>${cells.map((c) => `<td>${c.trim()}</td>`).join("")}</tr>`;
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, "<table>$1</table>")
    .replace(/^(?!<[hut\/<]).+$/gm, (line) => line.trim() ? `<p>${line}</p>` : "")
    .replace(/<p><\/p>/g, "");
}

interface Props {
  documents: Record<string, string>;
}

export default function DocumentViewer({ documents }: Props) {
  const [active, setActive] = useState("care-plan");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
              active === t.key
                ? "border-blue-600 text-blue-700 bg-blue-50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Document content */}
      <div className="bg-slate-50 rounded-b-xl border border-t-0 border-slate-200 max-h-[520px] overflow-y-auto">
        <div
          className="md-body p-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(documents[active] ?? "") }}
        />
      </div>
    </div>
  );
}
