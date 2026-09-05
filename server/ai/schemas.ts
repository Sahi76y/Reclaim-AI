import { z } from "zod";

export const recoveryActionEnum = z.enum([
  "SMART_RETRY",
  "CUSTOMER_DUNNING",
  "DYNAMIC_PAYMENT_LINK",
  "ESCALATE_HUMAN",
  "NONE",
]);

export const diagnosisSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

/**
 * Zod schema for validating the structured AI recommendation output.
 * Rejects out-of-range confidence scores and invalid action taxonomies.
 */
export const recoveryRecommendationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),

  diagnosis: z.object({
    summary: z.string().min(5, "Diagnosis summary must be at least 5 characters"),
    failureType: z.string().min(2, "Failure type must be specified"),
    likelyCause: z.string().min(5, "Likely cause must be explained"),
    severity: diagnosisSeverityEnum,
  }),

  recommendation: z.object({
    action: recoveryActionEnum,
    reason: z.string().min(5, "Recommendation reasoning must be detailed"),
    confidence: z
      .number({
        message: "Confidence must be a numeric value",
      })
      .min(0, "Confidence score cannot be negative")
      .max(1, "Confidence score cannot exceed 1.0"),
    expectedBenefit: z.string().min(3, "Expected benefit must be described"),
  }),

  safety: z.object({
    requiresCustomerAction: z.boolean(),
    requiresHumanReview: z.boolean(),
    shouldStopAutomation: z.boolean(),
  }),

  provider: z.string().default("mock"),
  model: z.string().default("mock-reasoning-v1"),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

/**
 * Forbidden keys that must NEVER be accepted in AI input (Ground-Truth Isolation Check).
 */
export const FORBIDDEN_GROUND_TRUTH_KEYS = [
  "isRecoverable",
  "recoverableAmount",
  "expectedRecoveryAction",
  "simulatedOutcome",
  "simulatedRecoveryLatencyHours",
  "evaluationNotes",
] as const;

/**
 * Zod schema for validating incoming AI input, strictly rejecting ground-truth leaks.
 */
export const aiInputSchema = z
  .object({
    eventId: z.string().min(1),
    amountAtRisk: z.number().int().positive(),
    amountAtRiskINR: z.number().positive(),
    currency: z.string().default("INR"),
    category: z.string(),
    severity: diagnosisSeverityEnum,
    paymentMethod: z.string(),
    failureCode: z.string(),
    failureReason: z.string(),
    attemptNumber: z.number().int().min(1),
    recoveryAttemptsCount: z.number().int().min(0),
    customerTier: z.string(),
    isSubscription: z.boolean(),
    subscriptionPlanId: z.string().optional(),
    previousSuccessCount: z.number().int().min(0),
    previousFailureCount: z.number().int().min(0),
    isRecoveryEligible: z.boolean(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const keys = Object.keys(data);
    for (const forbidden of FORBIDDEN_GROUND_TRUTH_KEYS) {
      if (keys.includes(forbidden)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Security violation: Ground truth evaluation field detected in AI input payload! (${forbidden})`,
          path: [forbidden],
        });
      }
    }
  });

export type ValidatedRecoveryRecommendation = z.infer<typeof recoveryRecommendationSchema>;

export type ConfidenceTier = "HIGH" | "MODERATE" | "LOW";

export interface ConfidencePolicyAssessment {
  tier: ConfidenceTier;
  confidence: number;
  policyDirective:
    | "ELIGIBLE_FOR_GUARDRAIL_EVALUATION"
    | "CONSERVATIVE_GUARDRAIL_EVALUATION"
    | "REQUIRE_HUMAN_REVIEW";
  requiresHumanReview: boolean;
  notes: string;
}

/**
 * Evaluates AI confidence against standard operational safety thresholds.
 */
export function assessConfidencePolicy(confidence: number): ConfidencePolicyAssessment {
  if (confidence >= 0.8) {
    return {
      tier: "HIGH",
      confidence,
      policyDirective: "ELIGIBLE_FOR_GUARDRAIL_EVALUATION",
      requiresHumanReview: false,
      notes:
        "High model confidence. Recommendation may proceed directly to policy guardrail check.",
    };
  } else if (confidence >= 0.6) {
    return {
      tier: "MODERATE",
      confidence,
      policyDirective: "CONSERVATIVE_GUARDRAIL_EVALUATION",
      requiresHumanReview: false,
      notes:
        "Moderate confidence. Policy engine should apply conservative limits on recovery attempts.",
    };
  } else {
    return {
      tier: "LOW",
      confidence,
      policyDirective: "REQUIRE_HUMAN_REVIEW",
      requiresHumanReview: true,
      notes: "Low model confidence (<0.60). Autonomous execution withheld; human review mandated.",
    };
  }
}
