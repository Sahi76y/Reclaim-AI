import React from "react";

export function FailureDonutChart() {
  // Compute or map categories matching Slide 4:
  // Non-Recoverable: 38.4% (Red)
  // Action Required: 26.1% (Amber)
  // Recoverable: 35.5% (Emerald)
  const segments = [
    {
      label: "Non-Recoverable",
      pct: 38.4,
      color: "#ef4444",
      dotClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
      desc: "Cannot be recovered or repeated decline",
    },
    {
      label: "Action Required",
      pct: 26.1,
      color: "#f59e0b",
      dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
      desc: "Customer needs to act or low balance",
    },
    {
      label: "Recoverable",
      pct: 35.5,
      color: "#10b981",
      dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
      desc: "Temporary payment problem & timeouts",
    },
  ];

  // SVG circle calculation: r = 38, C = 2 * PI * 38 = 238.761
  const r = 38;
  const c = 2 * Math.PI * r;

  let accumulatedPercent = 0;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-5 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-base font-black tracking-tight text-white sm:text-lg">
          Failure Categories
        </h2>
        <span className="font-mono text-[11px] text-slate-400">Why payments fail</span>
      </div>

      {/* Donut and Legend */}
      <div className="my-auto flex flex-col items-center justify-center gap-5 py-2 sm:flex-row">
        {/* SVG Donut */}
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#131b2e" strokeWidth="14" />
            {/* Segment arcs */}
            {segments.map((seg) => {
              const strokeDasharray = `${(seg.pct / 100) * c} ${c}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * c);
              accumulatedPercent += seg.pct;

              return (
                <circle
                  key={seg.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 hover:opacity-90"
                />
              );
            })}
          </svg>
          {/* Donut Center */}
          <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[11px] font-bold text-slate-400">1,000</span>
            <span className="font-mono text-[9px] text-slate-500 uppercase">Cases</span>
          </div>
        </div>

        {/* Legend matching Slide 4 */}
        <div className="flex w-full flex-col justify-center space-y-2.5 sm:w-auto">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.dotClass}`} />
                <span className="font-medium text-slate-300">{seg.label}</span>
              </div>
              <span className="font-mono font-bold text-white">{seg.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer link to detailed taxonomy */}
      <div className="flex items-center justify-between border-t border-[#1c2438]/80 pt-3 text-[11px] text-slate-400">
        <span>Payment Risk Distribution</span>
        <a
          href="#ai-diagnosis"
          className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          View 6 Categories →
        </a>
      </div>
    </div>
  );
}
