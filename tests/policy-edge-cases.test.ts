import { describe, it, expect } from "vitest";
import { PolicyEngine } from "@/server/policy";
import type { PolicyEvaluationInput } from "@/server/policy/types";

describe("Step 4A — Policy Edge-Case Independent Rule Verification", () => {
  const engine = new PolicyEngine();

  // Baseline template where all rules are clean and pass
  const cleanBaselineInput: PolicyEvaluationInput = {
    event: {
      eventId: "evt_clean_base",
      amountAtRisk: 250000,
      amountAtRiskINR: 2500,
      currency: "INR",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Temporary gateway timeout",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      previousSuccessCount: 5,
      previousFailureCount: 0,
      isRecoveryEligible: true,
    },
    recommendation: {
      eventId: "evt_clean_base",
      diagnosis: {
        summary: "Transient gateway timeout",
        failureType: "TEMPORARY_PAYMENT_FAILURE",
        likelyCause: "Acquiring bank timeout",
        severity: "LOW",
      },
      recommendation: {
        action: "SMART_RETRY",
        reason: "Zero friction retry path for transient failure",
        confidence: 0.88,
        expectedBenefit: "Recover without customer friction",
      },
      safety: {
        requiresCustomerAction: false,
        requiresHumanReview: false,
        shouldStopAutomation: false,
      },
      provider: "mock",
      model: "mock-reasoning-v1",
      generatedAt: new Date().toISOString(),
    },
  };

  /**
   * 1. RETRY-LIMIT CASE:
   * - attemptNumber = 3
   * - recoveryAttemptsCount below limit (1 < 2)
   * - amount below automated limit (₹2,500 <= ₹25,000)
   * - confidence >= 0.80 (0.85)
   * - non-critical (severity = LOW)
   * - recovery eligible (true)
   * - customerTier = REGULAR
   * - AI recommendation = SMART_RETRY
   *
   * Expected:
   * decision = ESCALATE
   * approvedAction = ESCALATE_HUMAN
   * Reason must explicitly mention: "Automatic retry limit reached"
   */
  it("Case 1 (Retry-limit): attemptNumber=3 escalates AI SMART_RETRY to ESCALATE_HUMAN and cites retry limit", () => {
    const input: PolicyEvaluationInput = {
      event: {
        ...cleanBaselineInput.event,
        eventId: "evt_edge_retry_limit",
        attemptNumber: 3, // > MAX_AUTOMATED_RETRIES (2)
        recoveryAttemptsCount: 1, // below limit (2)
        amountAtRiskINR: 2500, // below ₹25,000
        severity: "LOW", // non-critical
        isRecoveryEligible: true,
        customerTier: "REGULAR",
      },
      recommendation: {
        ...cleanBaselineInput.recommendation,
        eventId: "evt_edge_retry_limit",
        recommendation: {
          action: "SMART_RETRY",
          reason: "AI recommends retry attempt",
          confidence: 0.85, // >= 0.80
          expectedBenefit: "Recover without friction",
        },
      },
    };

    const decision = engine.evaluate(input);

    // Assert decision & action
    expect(decision.decision).toBe("ESCALATE");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.approvedAction).toBe("ESCALATE_HUMAN");
    expect(decision.requiresHumanReview).toBe(true);
    expect(decision.shouldStopAutomation).toBe(true);

    // Reason must explicitly mention "Automatic retry limit reached"
    const retryReason = decision.reasons.find((r) => r.includes("Automatic retry limit reached"));
    expect(retryReason).toBeDefined();
    expect(retryReason).toContain("Automatic retry limit reached");

    // Verify independent isolation: only Rule 4 failed, other 8 rules passed
    const failedRules = decision.ruleResults.filter((r) => !r.passed);
    expect(failedRules).toHaveLength(1);
    expect(failedRules[0].ruleId).toBe("RULE_04_RETRY_LIMIT");

    // All other rules passed
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_01_ELIGIBILITY")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_02_NON_RECOVERABLE")?.passed).toBe(
      true
    );
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_03_MAX_AMOUNT")?.passed).toBe(true);
    expect(
      decision.ruleResults.find((r) => r.ruleId === "RULE_05_INTERVENTION_LIMIT")?.passed
    ).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_06_CONFIDENCE")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_07_CHURN_RISK")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_08_CRITICAL_SEVERITY")?.passed).toBe(
      true
    );
    expect(
      decision.ruleResults.find((r) => r.ruleId === "RULE_09_ACTION_FEASIBILITY")?.passed
    ).toBe(true);
  });

  /**
   * 2. HIGH-VALUE CASE:
   * - amount > ₹25,000 (₹45,000)
   * - all other safety rules pass
   *
   * Expected:
   * ESCALATE → ESCALATE_HUMAN
   */
  it("Case 2 (High-value): amount > ₹25,000 independently escalates to ESCALATE_HUMAN", () => {
    const input: PolicyEvaluationInput = {
      event: {
        ...cleanBaselineInput.event,
        eventId: "evt_edge_high_value",
        amountAtRisk: 4500000,
        amountAtRiskINR: 45000, // > ₹25,000 limit
        attemptNumber: 1, // <= 2
        recoveryAttemptsCount: 0, // < 2
        severity: "LOW", // non-critical
        isRecoveryEligible: true,
        customerTier: "REGULAR",
      },
      recommendation: {
        ...cleanBaselineInput.recommendation,
        eventId: "evt_edge_high_value",
        recommendation: {
          action: "SMART_RETRY",
          reason: "AI recommends retry",
          confidence: 0.88, // >= 0.80
          expectedBenefit: "Recover without friction",
        },
      },
    };

    const decision = engine.evaluate(input);

    expect(decision.decision).toBe("ESCALATE");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.approvedAction).toBe("ESCALATE_HUMAN");
    expect(decision.requiresHumanReview).toBe(true);

    // Reason must state that transaction exceeds the automated limit
    expect(
      decision.reasons.some((r) => r.includes("exceeds the automated recovery limit of ₹25,000"))
    ).toBe(true);

    // Verify independent isolation: only Rule 3 failed
    const failedRules = decision.ruleResults.filter((r) => !r.passed);
    expect(failedRules).toHaveLength(1);
    expect(failedRules[0].ruleId).toBe("RULE_03_MAX_AMOUNT");
  });

  /**
   * 3. LOW-CONFIDENCE CASE:
   * - confidence < 0.60 (0.52)
   * - all other safety rules pass
   *
   * Expected:
   * ESCALATE → ESCALATE_HUMAN
   */
  it("Case 3 (Low-confidence): AI confidence < 0.60 independently escalates to ESCALATE_HUMAN", () => {
    const input: PolicyEvaluationInput = {
      event: {
        ...cleanBaselineInput.event,
        eventId: "evt_edge_low_confidence",
        amountAtRiskINR: 2500, // <= ₹25,000
        attemptNumber: 1, // <= 2
        recoveryAttemptsCount: 0, // < 2
        severity: "LOW", // non-critical
        isRecoveryEligible: true,
        customerTier: "REGULAR",
      },
      recommendation: {
        ...cleanBaselineInput.recommendation,
        eventId: "evt_edge_low_confidence",
        recommendation: {
          action: "SMART_RETRY",
          reason: "Model unsure of exact root cause",
          confidence: 0.52, // < 0.60 threshold
          expectedBenefit: "Possible recovery",
        },
      },
    };

    const decision = engine.evaluate(input);

    expect(decision.decision).toBe("ESCALATE");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.approvedAction).toBe("ESCALATE_HUMAN");
    expect(decision.requiresHumanReview).toBe(true);

    // Reason must explain low confidence requiring human review
    expect(
      decision.reasons.some((r) =>
        r.includes(
          "The AI is not confident enough for automatic recovery, so this case needs human review."
        )
      )
    ).toBe(true);

    // Verify independent isolation: only Rule 6 failed
    const failedRules = decision.ruleResults.filter((r) => !r.passed);
    expect(failedRules).toHaveLength(1);
    expect(failedRules[0].ruleId).toBe("RULE_06_CONFIDENCE");
  });

  /**
   * 4. NON-RECOVERABLE CASE:
   * - category = NON_RECOVERABLE
   * - recovery eligibility = false
   * - all other fields avoid accidentally triggering unrelated rules
   *
   * Expected:
   * BLOCK → NONE
   * shouldStopAutomation = true
   */
  it("Case 4 (Non-recoverable): category=NON_RECOVERABLE and isRecoveryEligible=false blocks automation", () => {
    const input: PolicyEvaluationInput = {
      event: {
        ...cleanBaselineInput.event,
        eventId: "evt_edge_non_recoverable",
        category: "NON_RECOVERABLE",
        isRecoveryEligible: false,
        amountAtRiskINR: 2500, // within limit so Rule 3 does not trigger
        attemptNumber: 1, // within limit so Rule 4 does not trigger
        recoveryAttemptsCount: 0, // within limit so Rule 5 does not trigger
        severity: "LOW", // non-critical so Rule 8 does not trigger
        customerTier: "REGULAR", // regular customer so Rule 7 does not trigger
      },
      recommendation: {
        ...cleanBaselineInput.recommendation,
        eventId: "evt_edge_non_recoverable",
        recommendation: {
          action: "NONE",
          reason: "Permanent instrument block detected",
          confidence: 0.95, // high confidence so Rule 6 does not trigger
          expectedBenefit: "Prevent fraudulent retry overhead",
        },
      },
    };

    const decision = engine.evaluate(input);

    expect(decision.decision).toBe("BLOCK");
    expect(decision.originalAction).toBe("NONE");
    expect(decision.approvedAction).toBe("NONE");
    expect(decision.shouldStopAutomation).toBe(true);

    // Reasons must include eligibility and non-recoverable category
    expect(decision.reasons.some((r) => r.includes("Automated recovery is not permitted"))).toBe(
      true
    );
    expect(
      decision.reasons.some((r) => r.includes("Failure is classified as non-recoverable"))
    ).toBe(true);

    // Other rules (Amount, Retries, Interventions, Confidence, Customer Risk, Severity, Feasibility) all pass
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_03_MAX_AMOUNT")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_04_RETRY_LIMIT")?.passed).toBe(true);
    expect(
      decision.ruleResults.find((r) => r.ruleId === "RULE_05_INTERVENTION_LIMIT")?.passed
    ).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_06_CONFIDENCE")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_07_CHURN_RISK")?.passed).toBe(true);
    expect(decision.ruleResults.find((r) => r.ruleId === "RULE_08_CRITICAL_SEVERITY")?.passed).toBe(
      true
    );
    expect(
      decision.ruleResults.find((r) => r.ruleId === "RULE_09_ACTION_FEASIBILITY")?.passed
    ).toBe(true);
  });

  /**
   * 5. SAFE SMART RETRY:
   * - attemptNumber = 1
   * - recoveryAttemptsCount = 0
   * - amount < ₹25,000 (₹2,500)
   * - confidence >= 0.80 (0.88)
   * - regular customer
   * - recovery eligible
   * - non-critical
   *
   * Expected:
   * ALLOW → SMART_RETRY
   */
  it("Case 5 (Safe Smart Retry): all rules pass and approves SMART_RETRY", () => {
    const input: PolicyEvaluationInput = {
      event: {
        ...cleanBaselineInput.event,
        eventId: "evt_edge_safe_smart_retry",
        attemptNumber: 1,
        recoveryAttemptsCount: 0,
        amountAtRiskINR: 2500,
        isRecoveryEligible: true,
        customerTier: "REGULAR",
        severity: "LOW",
        category: "TEMPORARY_PAYMENT_FAILURE",
      },
      recommendation: {
        ...cleanBaselineInput.recommendation,
        eventId: "evt_edge_safe_smart_retry",
        recommendation: {
          action: "SMART_RETRY",
          reason: "Transient failure with high historical success",
          confidence: 0.88,
          expectedBenefit: "Seamless frictionless recovery",
        },
      },
    };

    const decision = engine.evaluate(input);

    expect(decision.decision).toBe("ALLOW");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.approvedAction).toBe("SMART_RETRY");
    expect(decision.requiresHumanReview).toBe(false);
    expect(decision.requiresCustomerAction).toBe(false);
    expect(decision.shouldStopAutomation).toBe(false);

    // All 9 rules passed
    expect(decision.ruleResults.every((r) => r.passed)).toBe(true);
    expect(decision.reasons).toEqual([
      "All policy safety guardrails passed. Approved for automated execution.",
    ]);
  });
});
