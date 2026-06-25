import type { Finding } from "@/types/ndis";

const STATUS = {
  pass: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "PASS" },
  warn: { dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   label: "WARN" },
  fail: { dot: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50 border-red-200",     label: "FAIL" },
};

interface Props { findings: Finding[]; passed: boolean; }

export default function ValidationReport({ findings, passed }: Props) {
  const passCount = findings.filter((f) => f.status === "pass").length;
  const warnCount = findings.filter((f) => f.status === "warn").length;
  const failCount = findings.filter((f) => f.status === "fail").length;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={`rounded-xl border-2 p-4 flex items-center justify-between gap-4 ${passed ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${passed ? "bg-emerald-500" : "bg-red-500"}`}>
            {passed ? "✓" : "✗"}
          </div>
          <div>
            <p className={`font-bold text-sm ${passed ? "text-emerald-800" : "text-red-800"}`}>
              {passed ? "Validation passed — ready to export" : "Validation failed — review issues below"}
            </p>
            <p className={`text-xs mt-0.5 ${passed ? "text-emerald-600" : "text-red-600"}`}>
              {findings.length} rules checked
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-600">{passCount}</div>
            <div className="text-xs text-slate-500">Pass</div>
          </div>
          {warnCount > 0 && (
            <div>
              <div className="text-lg font-bold text-amber-600">{warnCount}</div>
              <div className="text-xs text-slate-500">Warn</div>
            </div>
          )}
          {failCount > 0 && (
            <div>
              <div className="text-lg font-bold text-red-600">{failCount}</div>
              <div className="text-xs text-slate-500">Fail</div>
            </div>
          )}
        </div>
      </div>

      {/* Findings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {findings.map((f, i) => {
          const cfg = STATUS[f.status];
          return (
            <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${cfg.bg}`}>
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-bold tracking-wider ${cfg.text}`}>{f.rule}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border ${cfg.bg.split(" ")[1]}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{f.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
