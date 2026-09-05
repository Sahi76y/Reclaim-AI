import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Award, ArrowUpRight, Zap, CheckCircle2 } from "lucide-react";
import type { BaselineComparison as BaselineComparisonType } from "@/server/evaluation/types";

interface BaselineComparisonProps {
  comparison: BaselineComparisonType;
}

export function BaselineComparison({ comparison }: BaselineComparisonProps) {
  const { baseline, reclaimai, lift } = comparison;

  const formatLakhs = (inr: number) => `₹${(inr / 100000).toFixed(2)}L`;

  return (
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                Performance Benchmark
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                1,000 Simulated Events
              </span>
            </div>
            <CardTitle className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
              Does AI actually help?
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 sm:text-sm">
              Comparing standard gateway retries against ReclaimAI adaptive recovery on the same
              dataset
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Award className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <div className="text-right">
              <span className="font-mono text-sm leading-none font-black text-emerald-300">
                +{lift.liftPercentage.toFixed(2)}% Lift
              </span>
              <p className="font-mono text-[10px] text-emerald-400/90">
                +{lift.recoveryRateDiff.toFixed(2)}% rate lift
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Baseline Approach */}
          <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-5">
            <div className="flex items-center justify-between border-b border-[#1c2438] pb-3">
              <div>
                <h4 className="font-mono text-sm font-bold text-slate-200">
                  Standard Retry Approach
                </h4>
                <p className="text-xs text-slate-400">
                  Automated retry for network drops only (No AI)
                </p>
              </div>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                Rule-Based
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Recovered Revenue
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-slate-300">
                  {formatLakhs(baseline.recoveredAmountINR)}
                </div>
                <p className="font-mono text-[11px] text-slate-500">
                  ₹{baseline.recoveredAmountINR.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Recovery Rate
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-slate-300">
                  {baseline.recoveryRateAgainstRecoverable.toFixed(2)}%
                </div>
                <p className="font-mono text-[11px] text-slate-500">
                  {baseline.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-[#1c2438] pt-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Limitation:</span> Misses balance
              drop-offs, OTP timeouts, and cart abandonments because it can only retry.
            </div>
          </div>

          {/* ReclaimAI Approach */}
          <div className="relative rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-[#0d1522] to-[#0c1019] p-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-white">
                    ReclaimAI Multi-Channel
                  </h4>
                  <p className="text-xs text-emerald-400">
                    Adaptive Retries + Payment Links + Dunning
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 shadow-xs">
                Active Agent
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  Recovered Revenue
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                  {formatLakhs(reclaimai.recoveredAmountINR)}
                </div>
                <p className="font-mono text-[11px] font-semibold text-emerald-300/90">
                  ₹{reclaimai.recoveredAmountINR.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  Recovery Rate
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                  {reclaimai.recoveryRateAgainstRecoverable.toFixed(2)}%
                </div>
                <p className="font-mono text-[11px] font-semibold text-emerald-300/90">
                  {reclaimai.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-emerald-500/20 pt-3 text-xs">
              <span className="font-semibold text-emerald-200">{lift.summary}</span>
              <span className="flex items-center font-mono font-bold text-emerald-300">
                <ArrowUpRight className="h-4 w-4" />
                +₹{(lift.netRecoveredAmountINR / 100000).toFixed(2)}L
              </span>
            </div>
          </div>
        </div>

        {/* Explanatory Disclaimer */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#1c2438] bg-[#090d16] p-3 text-xs text-slate-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            <strong className="text-slate-200">Simulation Benchmark Notice:</strong> ReclaimAI
            recovered more revenue than a standard retry-only strategy on the same 1,000 simulated
            payments. Results reflect reproducible offline benchmarks and do not imply live
            production merchant figures.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
