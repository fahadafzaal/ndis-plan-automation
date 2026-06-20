"use client";

const STEPS = ["Intake", "Review", "Documents"];

export default function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  done
                    ? "bg-blue-600 border-blue-600 text-white"
                    : active
                    ? "bg-white border-blue-600 text-blue-600"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${
                  active ? "text-blue-600" : done ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${
                  i < current ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
