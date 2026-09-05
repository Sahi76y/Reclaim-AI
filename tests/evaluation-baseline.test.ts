import { describe, it, expect } from "vitest";
import { evaluateBaselineRule, evaluateBaselineBatch } from "@/server/evaluation/baseline";
import type { AIInputDTO } from "@/server/ai/types";
import type { SyntheticGroundTruth } from "@/server/data/synthetic-generator";

describe("Deterministic Non-AI Baseline Model", () => {
  const createBaseEvent = (overrides?: Partial<AIInputDTO>): AIInputDTO => ({
    eventId: "evt_base_test",
    amountAtRisk: 250000, // ₹2,500
    amountAtRiskINR: 2500,
    currency: "INR",
    category: "TEMPORARY_PAYMENT_FAILURE",
    severity: "LOW",
    paymentMethod: "UPI",
    failureCode: "GATEWAY_TIMEOUT",
    failureReason: "Timeout",
    attemptNumber: 1,
    recoveryAttemptsCount: 0,
    customerTier: "REGULAR",
    isSubscription: false,
    isRecoveryEligible: true,
    previousSuccessCount: 2,
    previousFailureCount: 0,
    ...overrides,
  });

  it("attempts basic retry for eligible temporary payment failures", () => {
    const event = createBaseEvent({
      category: "TEMPORARY_PAYMENT_FAILURE",
      attemptNumber: 1,
      isRecoveryEligible: true,
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("SMART_RETRY");
    expect(decision.decision).toBe("ALLOW");
    expect(decision.isUnsafePrevented).toBe(false);
  });

  it("blocks non-recoverable events as unsafe", () => {
    const event = createBaseEvent({
      category: "NON_RECOVERABLE",
      isRecoveryEligible: false,
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("NONE");
    expect(decision.decision).toBe("BLOCK");
    expect(decision.isUnsafePrevented).toBe(true);
  });

  it("escalates cases with excessive retry counts", () => {
    const event = createBaseEvent({
      category: "TEMPORARY_PAYMENT_FAILURE",
      attemptNumber: 3,
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("ESCALATE_HUMAN");
    expect(decision.decision).toBe("ESCALATE");
    expect(decision.isUnsafePrevented).toBe(true);
  });

  it("escalates high-value transactions (> ₹50,000)", () => {
    const event = createBaseEvent({
      amountAtRisk: 6000000, // ₹60,000
      amountAtRiskINR: 60000,
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("ESCALATE_HUMAN");
    expect(decision.decision).toBe("ESCALATE");
    expect(decision.isUnsafePrevented).toBe(true);
  });

  it("does not attempt automated recovery for non-temporary categories without AI", () => {
    const event = createBaseEvent({
      category: "INSUFFICIENT_FUNDS",
      customerTier: "REGULAR",
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("NONE");
    expect(decision.decision).toBe("NONE");
  });

  it("escalates VIP customers for non-temporary categories", () => {
    const event = createBaseEvent({
      category: "CUSTOMER_ACTION_REQUIRED",
      customerTier: "VIP",
    });
    const decision = evaluateBaselineRule(event);
    expect(decision.action).toBe("ESCALATE_HUMAN");
    expect(decision.decision).toBe("ESCALATE");
  });

  it("evaluates a batch of events and calculates baseline metrics correctly", () => {
    const events: AIInputDTO[] = [
      createBaseEvent({
        eventId: "e1",
        category: "TEMPORARY_PAYMENT_FAILURE",
        amountAtRisk: 100000,
      }),
      createBaseEvent({
        eventId: "e2",
        category: "NON_RECOVERABLE",
        isRecoveryEligible: false,
        amountAtRisk: 200000,
      }),
      createBaseEvent({
        eventId: "e3",
        category: "TEMPORARY_PAYMENT_FAILURE",
        attemptNumber: 4,
        amountAtRisk: 300000,
      }),
    ];

    const groundTruths = new Map<string, SyntheticGroundTruth>([
      [
        "e1",
        {
          riskEventId: "e1",
          isRecoverable: true,
          recoverableAmount: 100000,
          expectedRecoveryAction: "SMART_RETRY",
          simulatedOutcome: "RECOVERED_FULL",
          simulatedRecoveryLatencyHours: 1,
          evaluationNotes: "Recoverable",
        },
      ],
      [
        "e2",
        {
          riskEventId: "e2",
          isRecoverable: false,
          recoverableAmount: 0,
          expectedRecoveryAction: "NONE",
          simulatedOutcome: "PERMANENT_FAILURE",
          simulatedRecoveryLatencyHours: 0,
          evaluationNotes: "Unrecoverable",
        },
      ],
      [
        "e3",
        {
          riskEventId: "e3",
          isRecoverable: true,
          recoverableAmount: 300000,
          expectedRecoveryAction: "SMART_RETRY",
          simulatedOutcome: "RECOVERED_FULL",
          simulatedRecoveryLatencyHours: 1,
          evaluationNotes: "Recoverable but excessive attempts",
        },
      ],
    ]);

    const result = evaluateBaselineBatch(events, groundTruths);
    expect(result.metrics.recoveryAttempts).toBe(1); // Only e1 attempted
    expect(result.metrics.recoveredAmountPaise).toBe(100000); // Only e1 recovered
    expect(result.metrics.recoveredAmountINR).toBe(1000);
    expect(result.metrics.escalations).toBe(1); // e3 escalated
    expect(result.metrics.unsafeActionsPrevented).toBe(2); // e2 blocked + e3 escalated
  });
});
