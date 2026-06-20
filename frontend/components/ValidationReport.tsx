import type { Finding } from "@/types/ndis";

const STATUS_CONFIG = {
  pass: { icon: "✓", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
  warn: { icon: "⚠", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  fail: { icon: "✗", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

interface Props {
  findings: Finding[];
  passed: boolean;
}

export default function ValidationReport({ findings, passed }: Props) {
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-semibold ${
          passed ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${passed ? "bg-green-500" : "bg-red-500"}`}>
          {passed ? "✓" : "✗"}
        </span>
        {passed ? "All validation rules passed — ready to export" : "Validation found issues — review before exporting"}
      </div>

      <div className="space-y-1.5">
        {findings.map((f, i) => {
          const cfg = STATUS_CONFIG[f.status];
          return (
            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div className="min-w-0">
                <span className={`text-xs font-bold ${cfg.text} mr-1.5`}>{f.rule}</span>
                <span className="text-xs text-slate-600">{f.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
