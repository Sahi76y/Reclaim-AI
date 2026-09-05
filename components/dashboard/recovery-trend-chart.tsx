import React from "react";

export function RecoveryTrendChart() {
  // Chart dimensions & milestones across April simulation window
  // Sourced to culminate exactly at the authoritative audited ₹21.12L recovered
  const points = [
    { date: "Apr 01", recovered: 4.2, failed: 3.2 },
    { date: "Apr 07", recovered: 8.5, failed: 4.6 },
    { date: "Apr 14", recovered: 12.8, failed: 5.9 },
    { date: "Apr 21", recovered: 16.9, failed: 7.1 },
    { date: "Apr 30", recovered: 21.12, failed: 8.5 },
  ];

  // SVG coordinate calculations (ViewBox: 0 0 320 140)
  // X range: 45 to 300 (width = 255, step = 63.75)
  // Y range: 15 (30L) to 115 (0L) (height = 100, scale = 100 / 30 = 3.333 px per Lakh)
  const getX = (index: number) => 45 + index * 63.75;
  const getY = (val: number) => 115 - (val / 30) * 100;

  const greenPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.recovered)}`)
    .join(" ");

  const redPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.failed)}`)
    .join(" ");

  const greenArea = `${greenPath} L ${getX(points.length - 1)} 115 L ${getX(0)} 115 Z`;

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-5 shadow-2xl backdrop-blur-sm">
      {/* Header with Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-base font-black tracking-tight text-white sm:text-lg">
          Recovery Trend
        </h2>
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span className="font-mono text-slate-300">Recovered Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            <span className="font-mono text-slate-400">Failed Amount</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="my-auto py-2">
        <svg className="h-36 w-full" viewBox="0 0 320 140" preserveAspectRatio="none">
          <defs>
            <linearGradient id="greenTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {[30, 20, 10, 0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1="40"
                  y1={y}
                  x2="310"
                  y2={y}
                  stroke="#1b253b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x="32"
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[9px]"
                >
                  {val === 0 ? "0" : `${val}L`}
                </text>
              </g>
            );
          })}

          {/* Area fill under Recovered Revenue */}
          <path d={greenArea} fill="url(#greenTrendGrad)" />

          {/* Failed Amount line (Red) */}
          <path
            d={redPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4 2"
            className="drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]"
          />

          {/* Recovered Revenue line (Green) */}
          <path
            d={greenPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={p.date}>
              {/* Green point */}
              <circle
                cx={getX(i)}
                cy={getY(p.recovered)}
                r="3.5"
                fill="#10b981"
                stroke="#090d16"
                strokeWidth="1.5"
                className="shadow-sm"
              />
              {/* Red point */}
              <circle
                cx={getX(i)}
                cy={getY(p.failed)}
                r="2.5"
                fill="#ef4444"
                stroke="#090d16"
                strokeWidth="1"
              />
              {/* X Axis Label */}
              <text
                x={getX(i)}
                y="132"
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[9px]"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between border-t border-[#1c2438]/80 pt-3 text-[11px] text-slate-400">
        <span>Apr 01 — Apr 30 Window</span>
        <span className="font-mono text-emerald-400">
          Culmination: <strong>₹21.12L</strong>
        </span>
      </div>
    </div>
  );
}
