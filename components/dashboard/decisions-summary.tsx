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
      color: "text-white",
      badgeClass: "border border-slate-700 bg-slate-800 text-slate-300",
      border: "border-[#1c2438] hover:border-slate-700",
      glow: "rgba(255,255,255,0.03)",
    },
    {
      label: "Recovery Opportunities",
      value: metrics.casesRecommendedForRecovery.toLocaleString("en-IN"),
      desc: "AI found potential recovery paths.",
      icon: Sparkles,
      badge: "80.5% Evaluated",
      color: "text-cyan-400",
      badgeClass: "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      border: "border-cyan-500/30 hover:border-cyan-500/60",
      glow: "rgba(6,182,212,0.08)",
    },
    {
      label: "Automatically Handled Safely",
      value: metrics.casesApprovedForAutonomousRecovery.toLocaleString("en-IN"),
      desc: "Cleared all safety rules for execution.",
      icon: CheckCircle2,
      badge: "Approved",
      color: "text-emerald-400",
      badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      border: "border-emerald-500/40 hover:border-emerald-500/70",
      glow: "rgba(16,185,129,0.12)",
    },
    {
      label: "Adjusted by Safety Rules",
      value: metrics.casesModifiedByPolicy.toLocaleString("en-IN"),
      desc: "Actions adjusted (e.g. retry -> payment link).",
      icon: Sliders,
      badge: "Modified",
      color: "text-amber-400",
      badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
      border: "border-amber-500/30 hover:border-amber-500/60",
      glow: "rgba(245,158,11,0.08)",
    },
    {
      label: "Sent to Human Help",
      value: metrics.casesEscalatedToHuman.toLocaleString("en-IN"),
      desc: "High-value payments & retry limits escalated.",
      icon: Users,
      badge: "Escalated",
      color: "text-purple-400",
      badgeClass: "border border-purple-500/30 bg-purple-500/10 text-purple-300",
      border: "border-purple-500/30 hover:border-purple-500/60",
      glow: "rgba(168,85,247,0.08)",
    },
    {
      label: "Stopped Completely",
      value: metrics.casesBlocked.toLocaleString("en-IN"),
      desc: "Permanently invalid cards blocked safely.",
      icon: Ban,
      badge: "Blocked",
      color: "text-rose-400",
      badgeClass: "border border-rose-500/30 bg-rose-500/10 text-rose-300",
      border: "border-rose-500/30 hover:border-rose-500/60",
      glow: "rgba(244,63,94,0.08)",
    },
  ];

  return (
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="p-6 pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Decision Pipeline
              </span>
            </div>
            <CardTitle className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
              What ReclaimAI Did
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 sm:text-sm">
              Clear breakdown of every decision made across the 1,000 payment failures
            </CardDescription>
            <p className="mt-1 text-xs text-slate-400">
              Decision-stage counts across the 1,000 reviewed payments. Some cases can appear in
              more than one stage.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={`flex flex-col justify-between rounded-xl border bg-[#090d16] p-4.5 transition-all duration-200 ${c.border}`}
                style={{ boxShadow: `0 0 15px ${c.glow}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">{c.label}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${c.badgeClass}`}
                  >
                    {c.badge}
                  </span>
                </div>

                <div className="my-3 flex items-baseline gap-2.5">
                  <Icon className={`h-5 w-5 shrink-0 ${c.color}`} />
                  <span className={`font-mono text-3xl font-black tracking-tight ${c.color}`}>
                    {c.value}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
