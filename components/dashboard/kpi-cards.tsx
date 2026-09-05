import React from "react";
import { Coins, TrendingUp, Clock } from "lucide-react";
import type { RevenueMetrics } from "@/server/evaluation/types";

interface KpiCardsProps {
  metrics: RevenueMetrics;
}

export function KpiCards({ metrics }: KpiCardsProps) {
  const formatLakhs = (inr: number) => `₹${(inr / 100000).toFixed(2)}L`;
  const formatFullINR = (inr: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(inr);

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Money at Risk (Red) */}
      <div className="group relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-b from-[#1d1016]/90 to-[#0c090e]/95 p-4.5 shadow-xl transition-all duration-200 hover:border-red-500/50 hover:shadow-[0_0_24px_rgba(239,68,68,0.18)]">
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
              {formatLakhs(metrics.totalRevenueAtRiskINR)}
            </div>
            <div className="text-xs font-bold text-slate-200">Money at Risk</div>
            <div className="text-[11px] text-slate-400">Total failed payments</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#1c2438]/80 pt-2 text-[10px] text-slate-400">
          <span className="font-mono">{formatFullINR(metrics.totalRevenueAtRiskINR)}</span>
          <span className="font-mono text-red-400">1,000 cases</span>
        </div>
      </div>

      {/* 2. Recoverable Money (Emerald) */}
      <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-[#0c1a17]/90 to-[#080f0d]/95 p-4.5 shadow-xl transition-all duration-200 hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.18)]">
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
              {formatLakhs(metrics.totalGroundTruthRecoverableINR)}
            </div>
            <div className="text-xs font-bold text-slate-200">Recoverable Money</div>
            <div className="text-[11px] text-slate-400">Identified by ReclaimAI</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#1c2438]/80 pt-2 text-[10px] text-slate-400">
          <span className="font-mono">{formatFullINR(metrics.totalGroundTruthRecoverableINR)}</span>
          <span className="font-mono text-emerald-400">Ground truth</span>
        </div>
      </div>

      {/* 3. Recovered Revenue (Cyan/Blue) */}
      <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0c1824]/90 to-[#070e17]/95 p-4.5 shadow-xl transition-all duration-200 hover:border-cyan-500/50 hover:shadow-[0_0_24px_rgba(6,182,212,0.18)]">
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-cyan-600 via-sky-400 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
              {formatLakhs(metrics.totalActuallyRecoveredINR)}
            </div>
            <div className="text-xs font-bold text-slate-200">Recovered Revenue</div>
            <div className="text-[11px] text-slate-400">Successfully recovered</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#1c2438]/80 pt-2 text-[10px] text-slate-400">
          <span className="font-mono">{formatFullINR(metrics.totalActuallyRecoveredINR)}</span>
          <span className="font-mono text-cyan-400">Simulated</span>
        </div>
      </div>

      {/* 4. Recovery Rate (Gold/Amber) */}
      <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1f190c]/90 to-[#0e0c06]/95 p-4.5 shadow-xl transition-all duration-200 hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.18)]">
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
              {metrics.recoveryRateAgainstRecoverable.toFixed(2)}%
            </div>
            <div className="text-xs font-bold text-slate-200">Recovery Rate</div>
            <div className="text-[11px] text-slate-400">Recovered / Recoverable</div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#1c2438]/80 pt-2 text-[10px] text-slate-400">
          <span className="font-mono">
            {metrics.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
          </span>
          <span className="font-mono text-amber-400">Audited</span>
        </div>
      </div>
    </div>
  );
}
