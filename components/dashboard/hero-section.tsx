import React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-6 shadow-2xl backdrop-blur-sm sm:p-7">
      {/* Subtle background ambient glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-red-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-cyan-600/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Main Product Heading & Value Proposition */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Autonomous Operations
            </span>
          </div>

          <h1 className="font-sans text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
            ReclaimAI —{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-500 to-red-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              AI Revenue Recovery
            </span>
          </h1>

          <p className="max-w-2xl text-xs font-medium text-slate-200 sm:text-sm">
            Intelligent recovery for failed payments, with safety rules built in.
          </p>
          <p className="max-w-2xl text-xs text-slate-400">
            Find at-risk payments, choose the safest recovery action, and recover more revenue.
          </p>
        </div>

        {/* Right side: Prominent Razorpay Test Mode Simulation Disclosure */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 shadow-[0_0_20px_rgba(245,158,11,0.06)] sm:max-w-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-amber-300 uppercase">
              RAZORPAY TEST MODE SIMULATION
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-200">No real money was moved.</p>
          <p className="text-[11px] leading-snug text-amber-400/80">
            All outcomes and recoveries reflect deterministic simulation benchmarks across 1,000
            payment-risk events.
          </p>
        </div>
      </div>
    </div>
  );
}
