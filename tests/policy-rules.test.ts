import { describe, it, expect } from "vitest";
import {
  evaluateRecoveryEligibility,
  evaluateNonRecoverableCategory,
  evaluateMaxTransactionAmount,
  evaluateRetryLimit,
  evaluateInterventionLimit,
  evaluateConfidencePolicy,
  evaluateHighRiskCustomer,
  evaluateCriticalSeverity,
  evaluateActionFeasibility,
} from "@/server/policy/rules";
import { DEFAULT_POLICY_CONFIG } from "@/server/policy/config";
import type { PolicyEvaluationInput } from "@/server/policy/types";

describe("Policy Rules Evaluators", () => {
  const baseInput: PolicyEvaluationInput = {
    event: {
      eventId: "evt_test_rule",
      amountAtRisk: 500000,
      amountAtRiskINR: 5000,
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
      eventId: "evt_test_rule",
      diagnosis: {
        summary: "Temporary network timeout",
        failureType: "GATEWAY_TIMEOUT",
        likelyCause: "Acquiring bank timeout",
        severity: "LOW",
      },
      recommendation: {
        action: "SMART_RETRY",
        reason: "Transient failure with high success history",
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

  describe("Rule 1: Recovery Eligibility", () => {
    it("BLOCKS recovery when isRecoveryEligible is false", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, isRecoveryEligible: false },
      };
      const result = evaluateRecoveryEligibility(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("BLOCK");
      expect(result.suggestedAction).toBe("NONE");
      expect(result.shouldStopAutomation).toBe(true);
      expect(result.reason).toContain("Automated recovery is not permitted for this event");
    });

    it("passes when isRecoveryEligible is true", () => {
      const result = evaluateRecoveryEligibility(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 2: Non-Recoverable Category", () => {
    it("BLOCKS events in the NON_RECOVERABLE category", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, category: "NON_RECOVERABLE" },
      };
      const result = evaluateNonRecoverableCategory(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("BLOCK");
      expect(result.suggestedAction).toBe("NONE");
      expect(result.shouldStopAutomation).toBe(true);
      expect(result.reason).toContain("non-recoverable");
    });

    it("passes for recoverable categories", () => {
      const result = evaluateNonRecoverableCategory(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 3: Max Transaction Amount Limit", () => {
    it("ESCALATES transactions exceeding maxAutomatedRecoveryAmountINR (e.g. ₹35,000 > ₹25,000)", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: {
          ...baseInput.event,
          amountAtRisk: 3500000,
          amountAtRiskINR: 35000,
        },
      };
      const result = evaluateMaxTransactionAmount(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.requiresHumanReview).toBe(true);
      expect(result.reason).toContain("exceeds the automated recovery limit");
    });

    it("passes transactions within limit (₹5,000 <= ₹25,000)", () => {
      const result = evaluateMaxTransactionAmount(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 4: Automated Retry Limit", () => {
    it("ESCALATES when attemptNumber exceeds maxAutomatedRetries (e.g. attempt 3 > max 2)", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, attemptNumber: 3 },
      };
      const result = evaluateRetryLimit(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.shouldStopAutomation).toBe(true);
      expect(result.reason).toContain("Automatic retry limit reached");
    });

    it("passes when attemptNumber is within limit (attempt 1 <= max 2)", () => {
      const result = evaluateRetryLimit(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 5: Recovery Intervention Limit", () => {
    it("ESCALATES when recoveryAttemptsCount reaches or exceeds limit (e.g. 2 >= max 2)", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, recoveryAttemptsCount: 2 },
      };
      const result = evaluateInterventionLimit(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.shouldStopAutomation).toBe(true);
      expect(result.reason).toContain("Maximum automated recovery interventions reached");
    });

    it("passes when recoveryAttemptsCount is below limit (0 < max 2)", () => {
      const result = evaluateInterventionLimit(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 6: AI Confidence Policy", () => {
    it("ESCALATES when confidence is below 0.60", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        recommendation: {
          ...baseInput.recommendation,
          recommendation: { ...baseInput.recommendation.recommendation, confidence: 0.52 },
        },
      };
      const result = evaluateConfidencePolicy(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.requiresHumanReview).toBe(true);
      expect(result.reason).toContain("The AI is not confident enough");
    });

    it("applies conservative evaluation for confidence 0.60 to 0.79", () => {
      // For SMART_RETRY on subsequent attempt, conservative policy modifies to dynamic payment link
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, attemptNumber: 2 },
        recommendation: {
          ...baseInput.recommendation,
          recommendation: {
            ...baseInput.recommendation.recommendation,
            action: "SMART_RETRY",
            confidence: 0.72,
          },
        },
      };
      const result = evaluateConfidencePolicy(input, DEFAULT_POLICY_CONFIG);
      expect(result.suggestedDecision).toBe("MODIFY");
      expect(result.suggestedAction).toBe("DYNAMIC_PAYMENT_LINK");
      expect(result.reason).toContain("Conservative policy requires customer payment link");
    });

    it("passes normally when confidence is >= 0.80", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        recommendation: {
          ...baseInput.recommendation,
          recommendation: { ...baseInput.recommendation.recommendation, confidence: 0.85 },
        },
      };
      const result = evaluateConfidencePolicy(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
      expect(result.reason).toContain("meets normal automation standards");
    });
  });

  describe("Rule 7: Customer Tier Risk (CHURN_RISK)", () => {
    it("ESCALATES repeated automated retries for CHURN_RISK customer", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: {
          ...baseInput.event,
          customerTier: "CHURN_RISK",
          recoveryAttemptsCount: 1,
        },
        recommendation: {
          ...baseInput.recommendation,
          recommendation: { ...baseInput.recommendation.recommendation, action: "SMART_RETRY" },
        },
      };
      const result = evaluateHighRiskCustomer(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.reason).toContain("CHURN_RISK");
    });

    it("passes for REGULAR or VIP customer tiers", () => {
      const result = evaluateHighRiskCustomer(baseInput, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(true);
    });
  });

  describe("Rule 8: Critical Incident Severity", () => {
    it("ESCALATES CRITICAL severity incidents", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, severity: "CRITICAL" },
      };
      const result = evaluateCriticalSeverity(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("ESCALATE");
      expect(result.suggestedAction).toBe("ESCALATE_HUMAN");
      expect(result.requiresHumanReview).toBe(true);
    });

    it("passes LOW, MEDIUM, and HIGH severity incidents", () => {
      expect(evaluateCriticalSeverity(baseInput, DEFAULT_POLICY_CONFIG).passed).toBe(true);
    });
  });

  describe("Rule 9: Action Feasibility & Taxonomy Safety", () => {
    it("modifies SMART_RETRY to DYNAMIC_PAYMENT_LINK when customer action is required", () => {
      const input: PolicyEvaluationInput = {
        ...baseInput,
        event: { ...baseInput.event, category: "CUSTOMER_ACTION_REQUIRED" },
        recommendation: {
          ...baseInput.recommendation,
          recommendation: { ...baseInput.recommendation.recommendation, action: "SMART_RETRY" },
        },
      };
      const result = evaluateActionFeasibility(input, DEFAULT_POLICY_CONFIG);
      expect(result.passed).toBe(false);
      expect(result.suggestedDecision).toBe("MODIFY");
      expect(result.suggestedAction).toBe("DYNAMIC_PAYMENT_LINK");
    });

    it("passes SMART_RETRY, CUSTOMER_DUNNING, DYNAMIC_PAYMENT_LINK, ESCALATE_HUMAN, and NONE when safe", () => {
      const actions = [
        "SMART_RETRY",
        "CUSTOMER_DUNNING",
        "DYNAMIC_PAYMENT_LINK",
        "ESCALATE_HUMAN",
        "NONE",
      ] as const;

      for (const action of actions) {
        const input: PolicyEvaluationInput = {
          ...baseInput,
          recommendation: {
            ...baseInput.recommendation,
            recommendation: { ...baseInput.recommendation.recommendation, action },
          },
        };
        const result = evaluateActionFeasibility(input, DEFAULT_POLICY_CONFIG);
        expect(result.passed).toBe(true);
      }
    });
  });
});
