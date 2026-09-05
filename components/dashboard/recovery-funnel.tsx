import React from "react";
import { ArrowRight, Info } from "lucide-react";
import type { RevenueMetrics } from "@/server/evaluation/types";

interface RecoveryFunnelProps {
  metrics: RevenueMetrics;
}

export function RecoveryFunnel({ metrics }: RecoveryFunnelProps) {
  const formatLakhs = (inr: number) => `₹${(inr / 100000).toFixed(2)}L`;

  const stages = [
    {
      id: "failures",
      amount: formatLakhs(metrics.totalRevenueAtRiskINR),
      stepNum: "1. Payment Failures",
      label: "Total at risk",
      gradient: "from-red-600 via-red-500 to-rose-600 shadow-[0_0_20px_rgba(239,68,68,0.35)]",
      tooltip: "Total value of all 1,000 failed or abandoned checkouts at risk.",
    },
    {
      id: "filtering",
      amount: formatLakhs(metrics.totalAIRecommendedValueINR),
      stepNum: "2. After Filtering",
      label: "Valid & recoverable",
      gradient: "from-rose-500 via-pink-600 to-purple-600 shadow-[0_0_20px_rgba(244,63,94,0.35)]",
      tooltip:
        "AI identifies potential recovery actions from payment patterns (Gross Recovery Potential).",
    },
    {
      id: "actions",
      amount: formatLakhs(metrics.totalPolicyApprovedValueINR),
      stepNum: "3. Actions Initiated",
      label: "Retries, links, reminders",
      gradient:
        "from-purple-600 via-violet-600 to-indigo-600 shadow-[0_0_20px_rgba(147,51,234,0.35)]",
      tooltip: "553 safely automated cases that passed deterministic policy guardrails.",
    },
    {
      id: "recovered",
      amount: formatLakhs(metrics.totalActuallyRecoveredINR),
      stepNum: "4. Recovered",
      label: "Successful payments",
      gradient:
        "from-emerald-500 via-teal-500 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.35)]",
      tooltip: "Successfully recovered in the test-mode simulation without blind retries.",
    },
  ];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-5 shadow-2xl backdrop-blur-sm">
      {/* Header matching Slide 4 */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-base font-black tracking-tight text-white sm:text-lg">
          Recovery Funnel
        </h2>
        <span className="font-mono text-[11px] text-slate-400">Amount (₹ in Lakhs)</span>
      </div>

      {/* 4 Connected Stages */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="relative flex flex-col">
            {/* Color block with Amount */}
            <div
              className={`flex h-20 items-center justify-center rounded-xl bg-gradient-to-r p-3 text-center transition-all duration-200 hover:scale-[1.02] ${stage.gradient}`}
            >
              <span className="font-mono text-2xl font-black tracking-tight text-white drop-shadow-md">
                {stage.amount}
              </span>
            </div>

            {/* Labels below block */}
            <div className="mt-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="font-mono text-xs font-bold text-white">{stage.stepNum}</span>
                {stage.tooltip && (
                  <span
                    title={stage.tooltip}
                    className="cursor-help text-slate-500 hover:text-slate-300"
                  >
                    <Info className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">{stage.label}</div>
            </div>

            {/* Connecting Arrow */}
            {idx < stages.length - 1 && (
              <div className="hidden lg:absolute lg:top-7 lg:-right-2.5 lg:z-10 lg:block">
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Micro-progression retention bar */}
      <div className="mt-4 flex items-center justify-between border-t border-[#1c2438]/80 pt-3 text-[11px] text-slate-400">
        <span>Smart Filtration Process</span>
        <span className="font-mono text-slate-300">
          Retention:{" "}
          <strong className="text-emerald-400">
            {metrics.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
          </strong>
        </span>
      </div>
    </div>
  );
}
