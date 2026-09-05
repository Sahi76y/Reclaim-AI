"use client";

import React, { useState } from "react";
import type { EvaluationResult } from "@/server/evaluation/types";
import { HeroSection } from "./hero-section";
import { KpiCards } from "./kpi-cards";
import { RecoveryFunnel } from "./recovery-funnel";
import { DecisionsSummary } from "./decisions-summary";
import { SafetySection } from "./safety-section";
import { BaselineComparison } from "./baseline-comparison";
import { StrategyBreakdown } from "./strategy-breakdown";
import { CategoryBreakdown } from "./category-breakdown";
import { PaymentChangeDetection } from "./change-detection";
import { RecentRecoveryActivity } from "./recent-activity";
import { AuditabilityChain } from "./auditability-chain";
import { TechnicalDetailsDrawer } from "./technical-details";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Terminal, ChevronDown, ChevronUp, AlertCircle, Clock } from "lucide-react";
import { AIRecommendationTester } from "@/components/ai-recommendation-tester";

function formatTimeIST(dateInput: string | Date): string {
  const d = new Date(dateInput);
  const ist = new Date(d.getTime() + 19800000); // UTC + 5:30
  const h = ist.getUTCHours();
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  const s = String(ist.getUTCSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m}:${s} ${ampm} IST`;
}

interface DashboardClientProps {
  initialEvaluation: EvaluationResult;
}

export function DashboardClient({ initialEvaluation }: DashboardClientProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult>(initialEvaluation);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() =>
    formatTimeIST(initialEvaluation.evaluatedAt)
  );
  const [showDevConsole, setShowDevConsole] = useState(false);

  const handleRerunEvaluation = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleSize: 1000, includeCaseRecords: true }),
      });

      if (!res.ok) {
        throw new Error(`Evaluation engine returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
        setLastRefreshedAt(formatTimeIST(data.evaluation.evaluatedAt));
      } else {
        throw new Error(data.error ?? "Failed to parse evaluation response");
      }
    } catch (err) {
      console.error("Error refreshing evaluation:", err);
      setRefreshError(err instanceof Error ? err.message : "Could not reach evaluation engine");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Hero Section with Prominent Test Mode Simulation Badge */}
      <section id="overview" className="scroll-mt-20">
        <HeroSection />
      </section>

      {/* Control Bar: Evaluation Refresh & Last Updated */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 shadow-2xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Benchmark Dataset:{" "}
            <strong className="font-mono text-slate-700 dark:text-slate-200">
              {evaluation.datasetSize.toLocaleString("en-IN")} cases
            </strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Last Evaluated: {lastRefreshedAt}</span>
        </div>

        <div className="flex items-center gap-2">
          {refreshError && (
            <span className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {refreshError}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunEvaluation}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Re-evaluating 1,000 Cases..." : "Re-run Evaluation"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Primary KPI Cards - Revenue at Risk */}
      <section id="risk-radar" className="scroll-mt-20">
        <KpiCards metrics={evaluation.revenueSummary} />
      </section>

      {/* 3. Recovery Funnel & Flow - AI Diagnosis */}
      <section id="ai-diagnosis" className="scroll-mt-20 space-y-8">
        <RecoveryFunnel metrics={evaluation.revenueSummary} />
        <DecisionsSummary metrics={evaluation.decisionSummary} />
      </section>

      {/* 4. Safety & Guardrail Protection + Baseline Comparison + Change Detection */}
      <section id="guardrails" className="scroll-mt-20 space-y-8">
        <SafetySection metrics={evaluation.safetySummary} />
        <BaselineComparison comparison={evaluation.baselineComparison} />
        <PaymentChangeDetection />
      </section>

      {/* 5. Razorpay Actions - Strategy Breakdown, Problem Taxonomy & Activity Feed */}
      <section id="razorpay-actions" className="scroll-mt-20 space-y-8">
        <StrategyBreakdown breakdown={evaluation.strategyBreakdown} />
        <CategoryBreakdown breakdown={evaluation.riskCategoryBreakdown} />
        <RecentRecoveryActivity cases={evaluation.cases} />
      </section>

      {/* 6. Traceability & Cryptographic Audit Chain */}
      <section id="audit-trail" className="scroll-mt-20">
        <AuditabilityChain />
      </section>

      {/* 7. Configuration & Technical Details */}
      <section id="config" className="scroll-mt-20 space-y-8">
        <TechnicalDetailsDrawer evaluation={evaluation} />

        {/* Developer / Test Console (Secondary & Preserved) */}
        <Card className="border-dashed border-slate-300 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/20">
          <CardHeader
            className="cursor-pointer py-4"
            onClick={() => setShowDevConsole(!showDevConsole)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Developer / Interactive Test Console
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Interactive single-event AI recommendation & policy guardrail tester
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
                  Dev Tools
                </Badge>
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 dark:border-slate-800">
                  {showDevConsole ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>

          {showDevConsole && (
            <CardContent className="border-t border-slate-200/60 pt-4 dark:border-slate-800">
              <AIRecommendationTester />
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
