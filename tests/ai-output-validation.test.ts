import { describe, it, expect } from "vitest";
import { recoveryRecommendationSchema, assessConfidencePolicy } from "@/server/ai/schemas";

describe("AI Output Schema Validation & Guardrails", () => {
  const validOutput = {
    eventId: "evt_syn_000001",
    diagnosis: {
      summary: "Transient failure during bank authorization",
      failureType: "GATEWAY_TIMEOUT",
      likelyCause: "Acquiring bank timeout under high load",
      severity: "MEDIUM" as const,
    },
    recommendation: {
      action: "SMART_RETRY" as const,
      reason: "Historical retry success is high and failure was non-fatal",
      confidence: 0.85,
      expectedBenefit: "Recovers transaction without customer disruption",
    },
    safety: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: false,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    generatedAt: new Date().toISOString(),
  };

  it("valid AI output passes Zod validation", () => {
    const result = recoveryRecommendationSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  describe("Confidence Score Bounds Validation", () => {
    it("rejects confidence > 1.0", () => {
      const invalid = {
        ...validOutput,
        recommendation: { ...validOutput.recommendation, confidence: 1.25 },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("cannot exceed 1.0");
      }
    });

    it("rejects confidence < 0", () => {
      const invalid = {
        ...validOutput,
        recommendation: { ...validOutput.recommendation, confidence: -0.1 },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("cannot be negative");
      }
    });

    it("rejects non-numeric confidence", () => {
      const invalid = {
        ...validOutput,
        recommendation: {
          ...validOutput.recommendation,
          confidence: "very high" as unknown as number,
        },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/numeric|number/i);
      }
    });

    it("accepts boundary confidence values 0.0 and 1.0", () => {
      const zeroConf = {
        ...validOutput,
        recommendation: { ...validOutput.recommendation, confidence: 0.0 },
      };
      const oneConf = {
        ...validOutput,
        recommendation: { ...validOutput.recommendation, confidence: 1.0 },
      };
      expect(recoveryRecommendationSchema.safeParse(zeroConf).success).toBe(true);
      expect(recoveryRecommendationSchema.safeParse(oneConf).success).toBe(true);
    });
  });

  describe("Recovery Action Taxonomy Validation", () => {
    it("rejects unauthorized financial execution actions", () => {
      const invalidActions = [
        "EXECUTE_PAYMENT",
        "DIRECT_DEBIT",
        "AUTO_REFUND",
        "CHARGE_CUSTOMER",
        "RANDOM_ACTION",
      ];

      for (const action of invalidActions) {
        const invalid = {
          ...validOutput,
          recommendation: {
            ...validOutput.recommendation,
            action: action as unknown as typeof validOutput.recommendation.action,
          },
        };
        const result = recoveryRecommendationSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }
    });

    it("accepts only valid allowed recovery actions", () => {
      const allowedActions = [
        "SMART_RETRY",
        "CUSTOMER_DUNNING",
        "DYNAMIC_PAYMENT_LINK",
        "ESCALATE_HUMAN",
        "NONE",
      ] as const;

      for (const action of allowedActions) {
        const valid = {
          ...validOutput,
          recommendation: { ...validOutput.recommendation, action },
        };
        const result = recoveryRecommendationSchema.safeParse(valid);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("Diagnosis Fields Completeness Validation", () => {
    it("rejects missing diagnosis summary", () => {
      const invalid = {
        ...validOutput,
        diagnosis: { ...validOutput.diagnosis, summary: "" },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects missing likely cause", () => {
      const invalid = {
        ...validOutput,
        diagnosis: { ...validOutput.diagnosis, likelyCause: "" },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid severity value", () => {
      const invalid = {
        ...validOutput,
        diagnosis: {
          ...validOutput.diagnosis,
          severity: "EXTREME" as unknown as typeof validOutput.diagnosis.severity,
        },
      };
      const result = recoveryRecommendationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Confidence Policy Assessment", () => {
    it("classifies >= 0.80 as HIGH confidence allowing guardrail evaluation", () => {
      const assessment = assessConfidencePolicy(0.85);
      expect(assessment.tier).toBe("HIGH");
      expect(assessment.requiresHumanReview).toBe(false);
      expect(assessment.policyDirective).toBe("ELIGIBLE_FOR_GUARDRAIL_EVALUATION");
    });

    it("classifies 0.60 to 0.79 as MODERATE confidence requiring conservative limits", () => {
      const assessment = assessConfidencePolicy(0.72);
      expect(assessment.tier).toBe("MODERATE");
      expect(assessment.requiresHumanReview).toBe(false);
      expect(assessment.policyDirective).toBe("CONSERVATIVE_GUARDRAIL_EVALUATION");
    });

    it("classifies < 0.60 as LOW confidence mandating human review", () => {
      const assessment = assessConfidencePolicy(0.45);
      expect(assessment.tier).toBe("LOW");
      expect(assessment.requiresHumanReview).toBe(true);
      expect(assessment.policyDirective).toBe("REQUIRE_HUMAN_REVIEW");
    });
  });
});
