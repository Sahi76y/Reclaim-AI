import React from "react";
import type { Metadata } from "next";
import { getLatestEvaluationResult, runEvaluationEngine } from "@/server/evaluation/engine";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "ReclaimAI — Autonomous Revenue Recovery Agent",
  description:
    "Autonomous financial operations agent that detects failed payments, formulates AI recovery recommendations, enforces deterministic safety policy guardrails, and executes recoveries in Razorpay test mode simulation.",
};

export default async function HomePage() {
  // Retrieve latest benchmark evaluation result.
  // If no cached evaluation exists or if it contains a partial test sample (< 1000),
  // execute full 1,000-event benchmark evaluation deterministically.
  let evaluation = getLatestEvaluationResult();
  if (!evaluation || evaluation.datasetSize < 1000) {
    try {
      evaluation = await runEvaluationEngine({ sampleSize: 1000, includeCaseRecords: true });
    } catch (err) {
      console.error("Failed to execute initial 1,000-event evaluation benchmark:", err);
    }
  }

  // Fallback guard: if evaluation is still unavailable, execute a minimal run
  if (!evaluation) {
    evaluation = await runEvaluationEngine({ sampleSize: 1000, includeCaseRecords: true });
  }

  return (
    <main className="min-h-screen">
      <DashboardClient initialEvaluation={evaluation} />
    </main>
  );
}
