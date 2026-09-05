import React from "react";
import { Target, Cpu, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export function TrustRibbon() {
  return (
    <div className="space-y-4">
      {/* Trust & Prototype Banner matching Slide 4 */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1c2438] bg-gradient-to-r from-[#120a10] via-[#090d16] to-[#0c1220] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Headline with Target Icon */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold text-white sm:text-xl">
                More recoveries. More revenue.
              </h3>
              <p className="font-sans text-base font-extrabold text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)] sm:text-lg">
                Autonomous recovery prototype.
              </p>
            </div>
          </div>

          {/* 4 Feature Pillars */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1c2438] bg-[#0f1422] text-slate-300">
                <Cpu className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">AI-powered diagnosis</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1c2438] bg-[#0f1422] text-slate-300">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Deterministic policy guardrails
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1c2438] bg-[#0f1422] text-slate-300">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Intelligent recovery actions
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1c2438] bg-[#0f1422] text-slate-300">
                <BarChart3 className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Deterministic simulation benchmark
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide 4 Bottom Console Footer */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-[#1c2438] pt-3 text-xs text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2 font-mono">
          <span className="font-extrabold text-white">
            RECLAIM<span className="text-red-500">AI</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] tracking-wider text-slate-400">
            RECOVER MORE. RISK LESS. KNOW WHY.
          </span>
        </div>
        <div className="font-mono text-[11px] text-amber-400/90">
          RAZORPAY TEST MODE SIMULATION — No real money was moved.
        </div>
      </div>
    </div>
  );
}
