import React from "react";
import { Badge } from "@/components/ui/badge";
import { Server, AlertTriangle } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#1c2438] bg-[#090d16]/90 px-6 backdrop-blur-md">
      {/* Left: Brand / Console Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-black tracking-wider text-white">
            RECLAIM<span className="text-red-500">AI</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="hidden text-xs font-medium tracking-wide text-slate-300 sm:inline">
            AI Revenue Recovery Agent
          </span>
        </div>

        <span className="text-slate-700">/</span>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span className="font-mono text-[11px] font-semibold text-slate-400">
            CONSOLE: ACTIVE
          </span>
        </div>
      </div>

      {/* Right: Test Mode Simulation Disclosures */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Prominent Visible Disclosure */}
        <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 md:flex">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span>No real money was moved.</span>
        </div>

        <Badge
          variant="secondary"
          className="gap-1.5 border border-amber-500/40 bg-amber-500/10 font-mono text-xs font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
        >
          <Server className="h-3 w-3 text-amber-400" />
          <span>RAZORPAY TEST MODE SIMULATION</span>
        </Badge>
      </div>
    </header>
  );
}
