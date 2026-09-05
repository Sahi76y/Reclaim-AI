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
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Performance Benchmark
              </span>
              <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                1,000 Simulated Events
              </span>
            </div>
            <CardTitle className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
              Does AI actually help?
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Comparing standard gateway retries against ReclaimAI adaptive recovery on the same
              dataset
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="text-right">
              <span className="font-mono text-sm leading-none font-black">
                +{lift.liftPercentage.toFixed(2)}% Lift
              </span>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                +{lift.recoveryRateDiff.toFixed(2)}% rate lift
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Baseline Approach */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Standard Retry Approach
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated retry for network drops only (No AI)
                </p>
              </div>
              <span className="rounded-sm bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Rule-Based
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Recovered Revenue
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-slate-700 dark:text-slate-300">
                  {formatLakhs(baseline.recoveredAmountINR)}
                </div>
                <p className="text-[11px] text-slate-400">
                  ₹{baseline.recoveredAmountINR.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Recovery Rate</span>
                <div className="mt-1 font-mono text-2xl font-black text-slate-700 dark:text-slate-300">
                  {baseline.recoveryRateAgainstRecoverable.toFixed(2)}%
                </div>
                <p className="text-[11px] text-slate-400">
                  {baseline.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200/80 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Limitation:</span>{" "}
              Misses balance drop-offs, OTP timeouts, and cart abandonments because it can only
              retry.
            </div>
          </div>

          {/* ReclaimAI Approach */}
          <div className="relative rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-xs dark:border-emerald-800/90 dark:from-emerald-950/30 dark:to-slate-900">
            <div className="flex items-center justify-between border-b border-emerald-200/70 pb-3 dark:border-emerald-800/60">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white dark:bg-emerald-500">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ReclaimAI Multi-Channel
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Adaptive Retries + Payment Links + Dunning
                  </p>
                </div>
              </div>
              <span className="rounded-sm bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                Active
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Recovered Revenue
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {formatLakhs(reclaimai.recoveredAmountINR)}
                </div>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  ₹{reclaimai.recoveredAmountINR.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Recovery Rate
                </span>
                <div className="mt-1 font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {reclaimai.recoveryRateAgainstRecoverable.toFixed(2)}%
                </div>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {reclaimai.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-emerald-200/70 pt-3 text-xs dark:border-emerald-800/60">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                {lift.summary}
              </span>
              <span className="flex items-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" />
                +₹{(lift.netRecoveredAmountINR / 100000).toFixed(2)}L
              </span>
            </div>
          </div>
        </div>

        {/* Explanatory Disclaimer */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>
            <strong>Simulation Benchmark Notice:</strong> ReclaimAI recovered more revenue than a
            standard retry-only strategy on the same 1,000 simulated payments. Results reflect
            reproducible offline benchmarks and do not imply live production merchant figures.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
