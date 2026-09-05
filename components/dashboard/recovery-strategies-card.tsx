import React from "react";

export function RecoveryStrategiesCard() {
  // Strategies matching Slide 4 presentation
  const strategies = [
    {
      label: "Smart Retry",
      pct: 42.3,
      barClass:
        "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
      desc: "Exponential retry on transient gateway glitches",
    },
    {
      label: "Payment Link",
      pct: 27.1,
      barClass: "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
      desc: "1-click recovery links sent via WhatsApp / SMS",
    },
    {
      label: "Customer Reminder",
      pct: 18.6,
      barClass:
        "bg-gradient-to-r from-purple-500 to-violet-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      desc: "Payday-timed notifications for balance top-ups",
    },
    {
      label: "Human Help",
      pct: 8.4,
      barClass:
        "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
      desc: "Escalated to human support for VIP checkouts",
    },
    {
      label: "No Action",
      pct: 3.6,
      barClass: "bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
      desc: "Permanently declined transactions skipped",
    },
  ];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-5 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-base font-black tracking-tight text-white sm:text-lg">
          Recovery Strategies Used
        </h2>
        <span className="font-mono text-[11px] text-slate-400">Share of Actions</span>
      </div>

      {/* Progress Bars matching Slide 4 */}
      <div className="my-auto space-y-3.5 py-3">
        {strategies.map((strat) => (
          <div key={strat.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">{strat.label}</span>
              <span className="font-mono font-bold text-white">{strat.pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#131b2e]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${strat.barClass}`}
                style={{ width: `${strat.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer link to detailed action breakdown */}
      <div className="flex items-center justify-between border-t border-[#1c2438]/80 pt-3 text-[11px] text-slate-400">
        <span>Execution Routing</span>
        <a
          href="#razorpay-actions"
          className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          View Full Actions Table →
        </a>
      </div>
    </div>
  );
}
