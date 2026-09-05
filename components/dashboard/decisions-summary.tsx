import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, Sliders, Users, Ban, Sparkles, FileText } from "lucide-react";
import type { DecisionMetrics } from "@/server/evaluation/types";

interface DecisionsSummaryProps {
  metrics: DecisionMetrics;
}

export function DecisionsSummary({ metrics }: DecisionsSummaryProps) {
  const cards = [
    {
      label: "Payments Reviewed",
      value: metrics.totalCasesEvaluated.toLocaleString("en-IN"),
      desc: "Full evaluation dataset analyzed.",
      icon: FileText,
      badge: "100% Ingested",
      color: "text-slate-900 dark:text-slate-100",
      bg: "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800",
    },
    {
      label: "Recovery Opportunities",
      value: metrics.casesRecommendedForRecovery.toLocaleString("en-IN"),
      desc: "AI found potential recovery paths.",
      icon: Sparkles,
      badge: "80.5% Evaluated",
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50/60 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60",
    },
    {
      label: "Automatically Handled Safely",
      value: metrics.casesApprovedForAutonomousRecovery.toLocaleString("en-IN"),
      desc: "Cleared all safety rules for execution.",
      icon: CheckCircle2,
      badge: "Approved",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60",
    },
    {
      label: "Adjusted by Safety Rules",
      value: metrics.casesModifiedByPolicy.toLocaleString("en-IN"),
      desc: "Actions adjusted (e.g. retry -> payment link).",
      icon: Sliders,
      badge: "Modified",
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60",
    },
    {
      label: "Sent to Human Help",
      value: metrics.casesEscalatedToHuman.toLocaleString("en-IN"),
      desc: "High-value payments & retry limits escalated.",
      icon: Users,
      badge: "Escalated",
      color: "text-purple-700 dark:text-purple-400",
      bg: "bg-purple-50/60 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/60",
    },
    {
      label: "Stopped Completely",
      value: metrics.casesBlocked.toLocaleString("en-IN"),
      desc: "Permanently invalid cards blocked safely.",
      icon: Ban,
      badge: "Blocked",
      color: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50/60 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60",
    },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="p-6 pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
              What ReclaimAI Did
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Clear breakdown of every decision made across the 1,000 payment failures
            </CardDescription>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Decision-stage counts across the 1,000 reviewed payments. Some cases can appear in
              more than one stage.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${c.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {c.label}
                  </span>
                  <span className="rounded-sm bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs dark:bg-slate-900/80 dark:text-slate-300">
                    {c.badge}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2">
                  <Icon className={`h-5 w-5 shrink-0 ${c.color}`} />
                  <span className={`font-mono text-3xl font-extrabold tracking-tight ${c.color}`}>
                    {c.value}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
