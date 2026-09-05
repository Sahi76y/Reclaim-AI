import React from "react";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Ban, RefreshCw, DollarSign, Lock } from "lucide-react";
import type { SafetyMetrics } from "@/server/evaluation/types";

interface SafetySectionProps {
  metrics: SafetyMetrics;
}

export function SafetySection({ metrics }: SafetySectionProps) {
  const safetyCards = [
    {
      title: "Failed Payments Safely Skipped",
      count: metrics.nonRecoverableCasesBlocked,
      desc: "Permanently invalid cards, closed bank accounts, and lost instruments skipped to prevent wasted fees.",
      icon: Ban,
      color: "text-rose-600 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-900/50",
    },
    {
      title: "Retry Limits Reached",
      count: metrics.excessiveRetryCasesEscalated,
      desc: "Payments with 2 or more prior failed attempts routed to human review to prevent bank penalties and customer annoyance.",
      icon: RefreshCw,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-900/50",
    },
    {
      title: "High-Value Payments",
      count: metrics.highValueCasesEscalated,
      desc: "Transactions over ₹50,000 diverted from automated retry into VIP white-glove concierge support.",
      icon: DollarSign,
      color: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-900/50",
    },
    {
      title: "Opportunities Held for Safety",
      count: metrics.policyBlockedRecoveryOpportunities,
      desc: "Recoverable payments intentionally withheld from automation because merchant risk thresholds prioritized caution.",
      icon: Lock,
      color: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-900/50",
    },
  ];

  return (
    <Card className="relative overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
      <CardHeader className="p-6 pb-4">
        {/* Main Philosophy Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  Built-in Guardrails
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  Zero Autonomous Overreach
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
                AI recommends. Safety rules decide.
              </h2>
            </div>
          </div>

          {/* Highlight Badge */}
          <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-white/90 px-4 py-2.5 shadow-xs dark:border-indigo-800 dark:bg-slate-800/80">
            <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <div className="font-mono text-xl font-black text-indigo-700 dark:text-indigo-300">
                {metrics.unsafeActionsPrevented}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Risky actions stopped or changed
              </p>
            </div>
          </div>
        </div>

        <CardDescription className="mt-2 text-xs text-slate-600 sm:text-sm dark:text-slate-300">
          ReclaimAI never blindly retries cards. Every AI recommendation must clear strict merchant
          policies before a single payment action is executed.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {safetyCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`flex flex-col justify-between rounded-xl border bg-white/80 p-4.5 shadow-2xs backdrop-blur-xs transition-shadow hover:shadow-xs dark:bg-slate-900/70 ${item.border}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                    <span className={`font-mono text-2xl font-black ${item.color}`}>
                      {item.count}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
