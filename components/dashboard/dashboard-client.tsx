"use client";

import React, { useState } from "react";
import type { EvaluationResult } from "@/server/evaluation/types";
import { HeroSection } from "./hero-section";
import { KpiCards } from "./kpi-cards";
import { ExecutiveRightStack } from "./executive-right-stack";
import { RecoveryFunnel } from "./recovery-funnel";
import { FailureDonutChart } from "./failure-donut-chart";
import { RecoveryStrategiesCard } from "./recovery-strategies-card";
import { RecoveryTrendChart } from "./recovery-trend-chart";
import { RecentRecoveryTable } from "./recent-recovery-table";
import { TrustRibbon } from "./trust-ribbon";
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
    <div className="space-y-10 pb-16">
      {/* 1. Hero Title Banner matching Slide 4 Top */}
      <section id="overview" className="scroll-mt-20">
        <HeroSection />
      </section>

      {/* Control Bar: Evaluation Refresh & Last Updated */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 px-5 py-3 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>
            Benchmark Dataset:{" "}
            <strong className="font-mono text-white">
              {evaluation.datasetSize.toLocaleString("en-IN")} cases
            </strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-[11px] text-slate-400">
            Last Evaluated: {lastRefreshedAt}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {refreshError && (
            <span className="flex items-center gap-1 font-mono text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {refreshError}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunEvaluation}
            disabled={isRefreshing}
            className="h-8 gap-1.5 border border-red-500/40 bg-red-500/10 font-mono text-xs font-semibold text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-500/20 hover:text-white"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Re-evaluating 1,000 Cases..." : "Re-run Evaluation"}</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SLIDE 4 EXECUTIVE CONSOLE (FAITHFUL COMPOSITION OF SLIDE 4)            */}
      {/* ========================================================================= */}
      <div className="space-y-5">
        {/* Upper Block: 4 KPI Cards + Funnel & Donut (Left 9 cols) vs Date & Context Stack (Right 3 cols) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Main Left Block (9 Columns) */}
          <div className="space-y-5 lg:col-span-9">
            {/* 4 KPI Cards */}
            <div id="risk-radar" className="scroll-mt-20">
              <KpiCards metrics={evaluation.revenueSummary} />
            </div>

            {/* Funnel & Failure Categories Row */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              <div className="md:col-span-7">
                <RecoveryFunnel metrics={evaluation.revenueSummary} />
              </div>
              <div className="md:col-span-5">
                <FailureDonutChart />
              </div>
            </div>
          </div>

          {/* Right Context Stack (3 Columns) */}
          <div className="lg:col-span-3">
            <ExecutiveRightStack
              datasetSize={evaluation.datasetSize}
              unsafeActionsPrevented={evaluation.safetySummary.unsafeActionsPrevented}
            />
          </div>
        </div>

        {/* Lower Block: 3 Equal Columns (Strategies + Trend + Recent Actions) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <RecoveryStrategiesCard />
          </div>
          <div>
            <RecoveryTrendChart />
          </div>
          <div>
            <RecentRecoveryTable />
          </div>
        </div>

        {/* Trust & Capability Ribbon + Console Footer */}
        <TrustRibbon />
      </div>

      {/* ========================================================================= */}
      {/* 3. DETAILED INTERACTIVE SECTIONS (PRESERVING DEEP-DIVE CAPABILITIES)       */}
      {/* ========================================================================= */}

      {/* Section 4: Policy Guardrails, Safety Enforcement & Baseline Comparison */}
      <section id="guardrails" className="scroll-mt-20 space-y-8">
        <SafetySection metrics={evaluation.safetySummary} />
        <BaselineComparison comparison={evaluation.baselineComparison} />
        <PaymentChangeDetection />
      </section>

      {/* Section 5: AI Diagnosis & Detailed Problem Taxonomy */}
      <section id="ai-diagnosis" className="scroll-mt-20 space-y-8">
        <DecisionsSummary metrics={evaluation.decisionSummary} />
        <CategoryBreakdown breakdown={evaluation.riskCategoryBreakdown} />
      </section>

      {/* Section 6: Razorpay Actions, Strategy Breakdown & Full Activity Ledger */}
      <section id="razorpay-actions" className="scroll-mt-20 space-y-8">
        <StrategyBreakdown breakdown={evaluation.strategyBreakdown} />
        <RecentRecoveryActivity cases={evaluation.cases} />
      </section>

      {/* Section 7: Auditability & Cryptographic Audit Trail */}
      <section id="audit-trail" className="scroll-mt-20">
        <AuditabilityChain />
      </section>

      {/* Section 8: Configuration & Developer Test Console */}
      <section id="config" className="scroll-mt-20 space-y-8">
        <TechnicalDetailsDrawer evaluation={evaluation} />

        {/* Developer / Test Console (Collapsible) */}
        <Card className="rounded-2xl border border-dashed border-[#1c2438] bg-[#090d16]/70 shadow-lg">
          <CardHeader
            className="cursor-pointer rounded-2xl py-4 transition-colors hover:bg-[#0c1220]"
            onClick={() => setShowDevConsole(!showDevConsole)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1c2438] bg-[#111726] text-slate-300 shadow-inner">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="font-mono text-sm font-bold text-white">
                    Developer / Interactive Test Console
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Interactive single-event AI recommendation & policy guardrail tester
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border border-[#1c2438] bg-[#0c1019] font-mono text-[10px] text-slate-400"
                >
                  Dev Tools
                </Badge>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1c2438] bg-[#0c1019] text-slate-400 hover:text-white">
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
            <CardContent className="border-t border-[#1c2438] p-6 pt-4">
              <AIRecommendationTester />
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
