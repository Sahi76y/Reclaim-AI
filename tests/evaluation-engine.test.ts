import { describe, it, expect } from "vitest";
import { runEvaluationEngine, getProviderModeMetadata } from "@/server/evaluation/engine";
import { evaluationResultSchema } from "@/server/evaluation/schemas";

describe("Evaluation & Revenue Recovery Benchmark Engine (Step 6)", () => {
  it("evaluates all 1,000 synthetic risk events through the complete pipeline", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000, includeCaseRecords: true });

    expect(result).toBeDefined();
    expect(result.datasetSize).toBe(1000);

    // Zod schema compliance
    const validated = evaluationResultSchema.safeParse(result);
    expect(validated.success).toBe(true);
  }, 30000);

  it("verifies provider-mode labeling and simulation disclosure", async () => {
    const metadata = getProviderModeMetadata();

    expect(metadata.providerMode).toBe("RAZORPAY_TEST_SIMULATION");
    expect(metadata.label).toBe("Razorpay Test Mode simulation");
    expect(metadata.isRealMoneyMoved).toBe(false);
    expect(metadata.isLiveApi).toBe(false);
    expect(metadata.disclaimer).toContain("Razorpay Test Mode simulation");
    expect(metadata.razorpayMode).toBe("test");
  });

  it("calculates accurate revenue metrics with bounded recovery rates", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { revenueSummary } = result;

    // Total at risk > 0
    expect(revenueSummary.totalRevenueAtRiskPaise).toBeGreaterThan(0);
    expect(revenueSummary.totalRevenueAtRiskINR).toBe(
      Math.round((revenueSummary.totalRevenueAtRiskPaise / 100) * 100) / 100
    );

    // Ground truth recoverable must be <= total at risk
    expect(revenueSummary.totalGroundTruthRecoverablePaise).toBeLessThanOrEqual(
      revenueSummary.totalRevenueAtRiskPaise
    );

    // Policy approved must be <= total at risk
    expect(revenueSummary.totalPolicyApprovedValuePaise).toBeLessThanOrEqual(
      revenueSummary.totalRevenueAtRiskPaise
    );

    // Actually recovered must be <= ground truth recoverable
    expect(revenueSummary.totalActuallyRecoveredPaise).toBeLessThanOrEqual(
      revenueSummary.totalGroundTruthRecoverablePaise
    );
    expect(revenueSummary.totalActuallyRecoveredPaise).toBeGreaterThan(0);

    // Recovery rates bounded in [0, 100]
    expect(revenueSummary.recoveryRateAgainstRecoverable).toBeGreaterThanOrEqual(0);
    expect(revenueSummary.recoveryRateAgainstRecoverable).toBeLessThanOrEqual(100);

    expect(revenueSummary.recoveryRateAgainstTotalRisk).toBeGreaterThanOrEqual(0);
    expect(revenueSummary.recoveryRateAgainstTotalRisk).toBeLessThanOrEqual(100);

    // Rate against recoverable should be >= rate against total risk
    expect(revenueSummary.recoveryRateAgainstRecoverable).toBeGreaterThanOrEqual(
      revenueSummary.recoveryRateAgainstTotalRisk
    );
  });

  it("computes consistent decision metrics summing to the dataset size", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { decisionSummary, datasetSize } = result;

    expect(decisionSummary.totalCasesEvaluated).toBe(datasetSize);
    expect(decisionSummary.casesRecommendedForRecovery).toBeGreaterThan(0);
    expect(decisionSummary.casesApprovedForAutonomousRecovery).toBeGreaterThan(0);
    expect(decisionSummary.casesModifiedByPolicy).toBeGreaterThan(0);
    expect(decisionSummary.casesEscalatedToHuman).toBeGreaterThan(0);
    expect(decisionSummary.casesBlocked).toBeGreaterThan(0);
    expect(decisionSummary.casesWithNoRecoveryAction).toBeGreaterThan(0);
  });

  it("tracks all critical safety guardrail metrics", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { safetySummary } = result;

    // Non-recoverable cases must be blocked
    expect(safetySummary.nonRecoverableCasesBlocked).toBeGreaterThan(0);

    // Excessive retry cases must be escalated
    expect(safetySummary.excessiveRetryCasesEscalated).toBeGreaterThan(0);

    // High value cases must be escalated
    expect(safetySummary.highValueCasesEscalated).toBeGreaterThan(0);

    // Unsafe actions prevented count must be positive
    expect(safetySummary.unsafeActionsPrevented).toBeGreaterThan(0);

    // False recovery attempts and policy blocked counts exist as numbers
    expect(typeof safetySummary.falseRecoveryAttempts).toBe("number");
    expect(typeof safetySummary.policyBlockedRecoveryOpportunities).toBe("number");
  });

  it("aggregates strategy breakdown across all five recovery actions", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { strategyBreakdown } = result;

    const expectedActions = [
      "SMART_RETRY",
      "DYNAMIC_PAYMENT_LINK",
      "CUSTOMER_DUNNING",
      "ESCALATE_HUMAN",
      "NONE",
    ];

    let totalCases = 0;
    for (const action of expectedActions) {
      const item = strategyBreakdown[action as keyof typeof strategyBreakdown];
      expect(item).toBeDefined();
      expect(item.action).toBe(action);
      expect(typeof item.caseCount).toBe("number");
      expect(typeof item.recoveredAmountINR).toBe("number");
      expect(item.recoveryRate).toBeGreaterThanOrEqual(0);
      expect(item.recoveryRate).toBeLessThanOrEqual(100);
      totalCases += item.caseCount;
    }

    expect(totalCases).toBe(1000);
  });

  it("aggregates risk category breakdown across all six standard categories", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { riskCategoryBreakdown } = result;

    const expectedCategories = [
      "TEMPORARY_PAYMENT_FAILURE",
      "INSUFFICIENT_FUNDS",
      "CUSTOMER_ACTION_REQUIRED",
      "REPEATED_PAYMENT_FAILURE",
      "ABANDONED_CHECKOUT",
      "NON_RECOVERABLE",
    ];

    let totalCases = 0;
    for (const cat of expectedCategories) {
      const item = riskCategoryBreakdown[cat as keyof typeof riskCategoryBreakdown];
      expect(item).toBeDefined();
      expect(item.category).toBe(cat);
      expect(item.caseCount).toBeGreaterThan(0);
      expect(item.amountAtRiskINR).toBeGreaterThan(0);
      totalCases += item.caseCount;
    }

    expect(totalCases).toBe(1000);

    // NON_RECOVERABLE category must have 0 recoverable and 0 recovered
    const nonRecoverable = riskCategoryBreakdown["NON_RECOVERABLE"];
    expect(nonRecoverable.recoverableAmountPaise).toBe(0);
    expect(nonRecoverable.recoveredAmountPaise).toBe(0);
  });

  it("compares ReclaimAI against baseline and demonstrates revenue lift", async () => {
    const result = await runEvaluationEngine({ sampleSize: 1000 });
    const { baselineComparison } = result;

    expect(baselineComparison.baseline).toBeDefined();
    expect(baselineComparison.reclaimai).toBeDefined();
    expect(baselineComparison.lift).toBeDefined();

    // ReclaimAI recovers more revenue than baseline due to multi-channel workflows
    expect(baselineComparison.reclaimai.recoveredAmountINR).toBeGreaterThan(
      baselineComparison.baseline.recoveredAmountINR
    );
    expect(baselineComparison.lift.netRecoveredAmountINR).toBeGreaterThan(0);
    expect(baselineComparison.lift.liftPercentage).toBeGreaterThan(0);
    expect(baselineComparison.lift.summary).toContain("ReclaimAI recovered");
  });

  it("produces 100% deterministic and reproducible evaluation results", async () => {
    const run1 = await runEvaluationEngine({ sampleSize: 200 });
    const run2 = await runEvaluationEngine({ sampleSize: 200 });

    expect(run1.revenueSummary.totalRevenueAtRiskPaise).toBe(
      run2.revenueSummary.totalRevenueAtRiskPaise
    );
    expect(run1.revenueSummary.totalActuallyRecoveredPaise).toBe(
      run2.revenueSummary.totalActuallyRecoveredPaise
    );
    expect(run1.decisionSummary.casesApprovedForAutonomousRecovery).toBe(
      run2.decisionSummary.casesApprovedForAutonomousRecovery
    );
    expect(run1.baselineComparison.lift.netRecoveredAmountPaise).toBe(
      run2.baselineComparison.lift.netRecoveredAmountPaise
    );
  });
});
