import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, ShieldCheck, Info } from "lucide-react";
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Money at Risk */}
      <Card className="relative overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Money at Risk
            </span>
            <div className="rounded-full bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {formatLakhs(metrics.totalRevenueAtRiskINR)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <p className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
            {formatFullINR(metrics.totalRevenueAtRiskINR)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Total value of all 1,000 failed or abandoned checkouts.
          </p>
        </CardContent>
      </Card>

      {/* 2. Recoverable Money */}
      <Card className="relative overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Recoverable Money
            </span>
            <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {formatLakhs(metrics.totalGroundTruthRecoverableINR)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <p className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
            {formatFullINR(metrics.totalGroundTruthRecoverableINR)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Benchmark-estimated recoverable payment value, excluding permanently unrecoverable
            cases.
          </p>
        </CardContent>
      </Card>

      {/* 3. Recovered Revenue */}
      <Card className="relative overflow-hidden border-emerald-300/80 bg-emerald-50/30 shadow-xs transition-shadow hover:shadow-sm dark:border-emerald-800/80 dark:bg-emerald-950/20">
        <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
              Recovered Revenue
            </span>
            <Badge variant="success" className="font-mono text-[10px] tracking-tight">
              Test Mode Simulation
            </Badge>
          </div>
          <CardTitle className="font-mono text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatLakhs(metrics.totalActuallyRecoveredINR)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <p className="font-mono text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {formatFullINR(metrics.totalActuallyRecoveredINR)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
            Simulated recovery through smart retries, links, and reminders.
          </p>
        </CardContent>
      </Card>

      {/* 4. Recovery Rate */}
      <Card className="relative overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Recovery Rate
              </span>
              <span
                title="Recovery rate = recovered revenue ÷ ground-truth recoverable money."
                className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="rounded-full bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="font-mono text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            {metrics.recoveryRateAgainstRecoverable.toFixed(2)}%
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <p className="font-mono text-xs font-medium text-purple-700 dark:text-purple-300">
            {metrics.recoveryRateAgainstTotalRisk.toFixed(2)}% of total risk
          </p>
          <p
            className="mt-1 text-[11px] text-slate-500 dark:text-slate-400"
            title="Recovery rate = recovered revenue ÷ ground-truth recoverable money."
          >
            Recovered revenue ÷ ground-truth recoverable money.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
