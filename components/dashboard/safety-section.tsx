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
      color: "text-rose-400",
      border: "border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.06)]",
    },
    {
      title: "Retry Limits Reached",
      count: metrics.excessiveRetryCasesEscalated,
      desc: "Payments with 2 or more prior failed attempts routed to human review to prevent bank penalties and customer annoyance.",
      icon: RefreshCw,
      color: "text-amber-400",
      border:
        "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.06)]",
    },
    {
      title: "High-Value Payments",
      count: metrics.highValueCasesEscalated,
      desc: "Transactions over ₹50,000 diverted from automated retry into VIP white-glove concierge support.",
      icon: DollarSign,
      color: "text-purple-400",
      border:
        "border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.06)]",
    },
    {
      title: "Opportunities Held for Safety",
      count: metrics.policyBlockedRecoveryOpportunities,
      desc: "Recoverable payments intentionally withheld from automation because merchant risk thresholds prioritized caution.",
      icon: Lock,
      color: "text-cyan-400",
      border: "border-cyan-500/30 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.06)]",
    },
  ];

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c1019]/90 shadow-2xl backdrop-blur-sm">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-red-500/10 blur-3xl" />

      <CardHeader className="p-6 pb-4">
        {/* Main Philosophy Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest text-amber-400 uppercase">
                  Built-in Guardrails
                </span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  Zero Autonomous Overreach
                </span>
              </div>
              <h2 className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">
                AI recommends. Safety rules decide.
              </h2>
            </div>
          </div>

          {/* Highlight Badge */}
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-[#121929] px-4 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <ShieldAlert className="h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div>
              <div className="font-mono text-2xl font-black text-amber-400">
                {metrics.unsafeActionsPrevented}
              </div>
              <p className="font-mono text-[11px] font-semibold text-slate-300">
                Risky actions stopped or changed
              </p>
            </div>
          </div>
        </div>

        <CardDescription className="mt-2 text-xs text-slate-300 sm:text-sm">
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
                className={`flex flex-col justify-between rounded-xl border bg-[#090d16] p-4.5 transition-all duration-200 ${item.border}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                    <span className={`font-mono text-2xl font-black ${item.color}`}>
                      {item.count}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-white">{item.title}</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
