import { describe, it, expect } from "vitest";
import {
  getAIInputByEventId,
  saveRecoveryRecommendation,
  getRecoveryRecommendationByEventId,
} from "@/server/risk-events/repository";
import { FORBIDDEN_GROUND_TRUTH_KEYS, aiInputSchema } from "@/server/ai/schemas";

describe("AI Ground-Truth & PII Isolation Boundary", () => {
  it("proves getAIInputByEventId excludes all EventGroundTruth fields", async () => {
    // evt_syn_000001 exists in synthetic generator / fallback dataset
    const aiInput = await getAIInputByEventId("evt_syn_000001");
    expect(aiInput).not.toBeNull();

    if (!aiInput) return;

    // Check all forbidden ground truth keys
    for (const forbiddenKey of FORBIDDEN_GROUND_TRUTH_KEYS) {
      expect(aiInput).not.toHaveProperty(forbiddenKey);
      expect((aiInput as unknown as Record<string, unknown>)[forbiddenKey]).toBeUndefined();
    }

    // Verify specifically
    const rawInput = aiInput as unknown as Record<string, unknown>;
    expect(rawInput.isRecoverable).toBeUndefined();
    expect(rawInput.recoverableAmount).toBeUndefined();
    expect(rawInput.expectedRecoveryAction).toBeUndefined();
    expect(rawInput.simulatedOutcome).toBeUndefined();
    expect(rawInput.simulatedRecoveryLatencyHours).toBeUndefined();
    expect(rawInput.evaluationNotes).toBeUndefined();
  });

  it("proves customer PII (e.g. email) is excluded from AI input", async () => {
    const aiInput = await getAIInputByEventId("evt_syn_000001");
    expect(aiInput).not.toBeNull();

    if (!aiInput) return;

    const rawInput = aiInput as unknown as Record<string, unknown>;
    expect(rawInput.customerEmail).toBeUndefined();
    expect(rawInput.email).toBeUndefined();
  });

  it("aiInputSchema strictly rejects payloads leaking ground-truth fields", () => {
    const validPayload = {
      eventId: "evt_test_safe",
      amountAtRisk: 150000,
      amountAtRiskINR: 1500,
      currency: "INR",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW" as const,
      paymentMethod: "UPI",
      failureCode: "PAYMENT_TIMED_OUT",
      failureReason: "Gateway timeout",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      previousSuccessCount: 3,
      previousFailureCount: 0,
      isRecoveryEligible: true,
    };

    // Safe payload passes
    const validResult = aiInputSchema.safeParse(validPayload);
    expect(validResult.success).toBe(true);

    // Injecting each forbidden key must fail schema validation
    for (const forbiddenKey of FORBIDDEN_GROUND_TRUTH_KEYS) {
      const contaminatedPayload = {
        ...validPayload,
        [forbiddenKey]: forbiddenKey === "isRecoverable" ? true : 1234,
      };

      const contaminatedResult = aiInputSchema.safeParse(contaminatedPayload);
      expect(contaminatedResult.success).toBe(false);
      if (!contaminatedResult.success) {
        expect(contaminatedResult.error.issues[0]?.message).toContain(
          "Security violation: Ground truth evaluation field detected"
        );
      }
    }
  });

  it("persisted RecoveryRecommendation does not contain ground-truth fields", async () => {
    const testRecommendation = {
      riskEventId: "evt_isolation_test",
      action: "SMART_RETRY",
      confidenceScore: 0.88,
      reasoning: "Transient failure with high success history",
      diagnosisSummary: "Network timeout at acquiring bank",
      likelyCause: "Bank gateway dropped connection",
      severity: "LOW",
      expectedBenefit: "Immediate recovery without customer friction",
      safetyFlags: {
        requiresCustomerAction: false,
        requiresHumanReview: false,
        shouldStopAutomation: false,
      },
      provider: "mock",
      model: "mock-reasoning-v1",
      createdAt: new Date(),
    };

    await saveRecoveryRecommendation(testRecommendation);

    const saved = await getRecoveryRecommendationByEventId("evt_isolation_test");
    expect(saved).not.toBeNull();
    if (!saved) return;

    // Verify stored fields match
    expect(saved.action).toBe("SMART_RETRY");
    expect(saved.confidenceScore).toBe(0.88);

    // Verify NO ground truth fields exist in saved recommendation
    for (const forbiddenKey of FORBIDDEN_GROUND_TRUTH_KEYS) {
      expect(saved).not.toHaveProperty(forbiddenKey);
      expect((saved as unknown as Record<string, unknown>)[forbiddenKey]).toBeUndefined();
    }
  });
});
