import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, Sparkles, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { RevenueMetrics } from "@/server/evaluation/types";

interface RecoveryFunnelProps {
  metrics: RevenueMetrics;
}

export function RecoveryFunnel({ metrics }: RecoveryFunnelProps) {
  const formatLakhs = (inr: number) => `₹${(inr / 100000).toFixed(2)}L`;

  const steps = [
    {
      id: "step1",
      label: "Money at Risk",
      value: formatLakhs(metrics.totalRevenueAtRiskINR),
      subtext: "1,000 Failed Payments",
      desc: "Raw payment drops, timeouts, and card declines.",
      icon: AlertTriangle,
      color:
        "border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
      iconColor: "text-rose-600 dark:text-rose-400",
      accent: "bg-rose-500",
      width: "100%",
    },
    {
      id: "step2",
      label: "Gross Recovery Potential",
      value: formatLakhs(metrics.totalAIRecommendedValueINR),
      subtext: "AI Recommended (805 cases)",
      desc: "AI identifies potential recovery actions from payment patterns.",
      tooltip:
        "Total value for which the AI recommended an active recovery action. This can exceed the theoretically recoverable amount because the AI does not know the ground truth.",
      icon: Sparkles,
      color:
        "border-blue-300 bg-blue-50/70 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "bg-blue-500",
      width: "82%",
    },
    {
      id: "step3",
      label: "Policy Approved Volume",
      value: formatLakhs(metrics.totalPolicyApprovedValueINR),
      subtext: "553 safely automated cases",
      desc: "Safety rules block spam retries and protect VIPs.",
      tooltip: "Value of recovery actions that passed deterministic safety and policy checks.",
      icon: Shield,
      color:
        "border-indigo-300 bg-indigo-50/70 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      accent: "bg-indigo-500",
      width: "69%",
    },
    {
      id: "step4",
      label: "Recovered Revenue",
      value: formatLakhs(metrics.totalActuallyRecoveredINR),
      subtext: `Simulation (${metrics.recoveryRateAgainstRecoverable.toFixed(2)}% rate)`,
      desc: "Successfully recovered in the test-mode simulation without blind retries.",
      icon: CheckCircle2,
      color:
        "border-emerald-300 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      accent: "bg-emerald-500",
      width: "48%",
    },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
              The Recovery Funnel
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              How ReclaimAI filters money at risk into safe, confirmed recoveries
            </CardDescription>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Smart Filtration Process
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        {/* Step-by-Step Desktop Connected Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative flex flex-col">
                <div
                  className={`flex h-full flex-col justify-between rounded-xl border p-4.5 transition-all ${step.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${step.iconColor}`} />
                        <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">
                          {step.label}
                        </span>
                        {step.tooltip && (
                          <span
                            title={step.tooltip}
                            className="cursor-help opacity-70 hover:opacity-100"
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold opacity-60">0{idx + 1}</span>
                    </div>

                    <div className="mt-3">
                      <div className="font-mono text-2xl font-extrabold tracking-tight">
                        {step.value}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold opacity-90">{step.subtext}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] leading-snug opacity-75">{step.desc}</p>
                </div>

                {/* Arrow indicator between cards */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:absolute lg:top-1/2 lg:-right-3 lg:z-10 lg:-translate-y-1/2 lg:transform">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800">
                      <ArrowRight className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Intuitive Width Funnel Visualization */}
        <div className="mt-6 space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
            <span>Volume Retention & Safety Taper</span>
            <span className="font-mono text-[11px]">
              {formatLakhs(metrics.totalRevenueAtRiskINR)} →{" "}
              {formatLakhs(metrics.totalActuallyRecoveredINR)} Realized
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {steps.map((step) => (
              <div key={`bar-${step.id}`} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {step.label}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {step.value}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${step.accent}`}
                    style={{ width: step.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
