"use client";

const STEPS = [
  { label: "Intake", desc: "Parse notes" },
  { label: "Review", desc: "Confirm data" },
  { label: "Documents", desc: "Export plan" },
];

export default function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  done
                    ? "bg-white border-white text-blue-700 shadow"
                    : active
                    ? "bg-white/20 border-white text-white shadow-inner"
                    : "bg-transparent border-white/30 text-white/40"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`mt-1.5 text-xs font-semibold transition-colors ${active ? "text-white" : done ? "text-blue-100" : "text-white/40"}`}>
                {s.label}
              </span>
              <span className={`text-[10px] transition-colors ${active ? "text-blue-200" : done ? "text-blue-200/60" : "text-white/25"}`}>
                {s.desc}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-20 sm:w-28 mx-3 mb-7 rounded-full transition-all duration-500 ${i < current ? "bg-white" : "bg-white/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
