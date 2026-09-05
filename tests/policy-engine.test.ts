import { describe, it, expect } from "vitest";
import { PolicyEngine, evaluatePolicy } from "@/server/policy";
import type { PolicyEvaluationInput } from "@/server/policy/types";
import { FORBIDDEN_GROUND_TRUTH_KEYS } from "@/server/ai/schemas";

describe("PolicyEngine Core Architecture & Precedence", () => {
  const safeInput: PolicyEvaluationInput = {
    event: {
      eventId: "evt_safe_test",
      amountAtRisk: 250000,
      amountAtRiskINR: 2500,
      currency: "INR",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Gateway timed out",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      previousSuccessCount: 3,
      previousFailureCount: 0,
      isRecoveryEligible: true,
    },
    recommendation: {
      eventId: "evt_safe_test",
      diagnosis: {
        summary: "Transient failure during bank authorization",
        failureType: "GATEWAY_TIMEOUT",
        likelyCause: "Bank gateway dropped connection",
        severity: "LOW",
      },
      recommendation: {
        action: "SMART_RETRY",
        reason: "Historical retry success is high and failure was non-fatal",
        confidence: 0.88,
        expectedBenefit: "Immediate recovery without customer friction",
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

  it("produces identical decisions for identical inputs (Determinism)", () => {
    const engine = new PolicyEngine();
    const decision1 = engine.evaluate(safeInput);
    const decision2 = engine.evaluate(safeInput);

    expect(decision1.decision).toBe(decision2.decision);
    expect(decision1.approvedAction).toBe(decision2.approvedAction);
    expect(decision1.originalAction).toBe(decision2.originalAction);
    expect(decision1.reasons).toEqual(decision2.reasons);
    expect(decision1.requiresHumanReview).toBe(decision2.requiresHumanReview);
    expect(decision1.shouldStopAutomation).toBe(decision2.shouldStopAutomation);
  });

  it("ALLOWS safe recommendation without alteration", () => {
    const decision = evaluatePolicy(safeInput);
    expect(decision.decision).toBe("ALLOW");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.approvedAction).toBe("SMART_RETRY");
    expect(decision.requiresHumanReview).toBe(false);
    expect(decision.shouldStopAutomation).toBe(false);
  });

  it("ESCALATES when retry limit exceeded while preserving original AI action", () => {
    const excessiveRetriesInput: PolicyEvaluationInput = {
      ...safeInput,
      event: { ...safeInput.event, attemptNumber: 3 },
    };

    const decision = evaluatePolicy(excessiveRetriesInput);

    // Decision is ESCALATE
    expect(decision.decision).toBe("ESCALATE");
    // Approved action is converted to human review
    expect(decision.approvedAction).toBe("ESCALATE_HUMAN");
    // Original AI recommendation MUST remain preserved
    expect(decision.originalAction).toBe("SMART_RETRY");
    // Flags are updated
    expect(decision.requiresHumanReview).toBe(true);
    expect(decision.shouldStopAutomation).toBe(true);
    expect(decision.reasons.some((r) => r.includes("retry limit reached"))).toBe(true);
  });

  it("BLOCKS when event is not eligible for automated recovery", () => {
    const ineligibleInput: PolicyEvaluationInput = {
      ...safeInput,
      event: { ...safeInput.event, isRecoveryEligible: false },
    };

    const decision = evaluatePolicy(ineligibleInput);

    expect(decision.decision).toBe("BLOCK");
    expect(decision.approvedAction).toBe("NONE");
    expect(decision.originalAction).toBe("SMART_RETRY");
    expect(decision.shouldStopAutomation).toBe(true);
    expect(decision.reasons.some((r) => r.includes("Automated recovery is not permitted"))).toBe(
      true
    );
  });

  it("BLOCK precedence overrides ESCALATE (Strict Safety Precedence)", () => {
    // Both ineligible (BLOCK) and excessive amount (ESCALATE)
    const combinedInput: PolicyEvaluationInput = {
      ...safeInput,
      event: {
        ...safeInput.event,
        isRecoveryEligible: false,
        amountAtRisk: 8000000,
        amountAtRiskINR: 80000,
      },
    };

    const decision = evaluatePolicy(combinedInput);

    // BLOCK has highest precedence
    expect(decision.decision).toBe("BLOCK");
    expect(decision.approvedAction).toBe("NONE");
    expect(decision.shouldStopAutomation).toBe(true);
  });

  it("confirms PolicyDecision does not contain ground-truth fields", () => {
    const decision = evaluatePolicy(safeInput);
    const rawDecision = decision as unknown as Record<string, unknown>;

    for (const forbidden of FORBIDDEN_GROUND_TRUTH_KEYS) {
      expect(rawDecision).not.toHaveProperty(forbidden);
      expect(rawDecision[forbidden]).toBeUndefined();
    }
  });

  it("respects custom configuration overrides", () => {
    // Override max amount to ₹1,000 (safeInput is ₹2,500)
    const decision = evaluatePolicy(safeInput, {
      maxAutomatedRecoveryAmountINR: 1000,
    });

    expect(decision.decision).toBe("ESCALATE");
    expect(decision.approvedAction).toBe("ESCALATE_HUMAN");
    expect(decision.reasons.some((r) => r.includes("exceeds the automated recovery limit"))).toBe(
      true
    );
  });
});
