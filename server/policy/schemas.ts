import { z } from "zod";
import { recoveryActionEnum } from "@/server/ai/schemas";

export const policyDecisionOutcomeEnum = z.enum(["ALLOW", "MODIFY", "ESCALATE", "BLOCK"]);

export const ruleResultSchema = z.object({
  ruleId: z.string().min(1),
  ruleName: z.string().min(1),
  passed: z.boolean(),
  reason: z.string().min(1),
  suggestedAction: recoveryActionEnum.optional(),
  suggestedDecision: policyDecisionOutcomeEnum.optional(),
  requiresHumanReview: z.boolean().optional(),
  shouldStopAutomation: z.boolean().optional(),
});

export const policyConfigSchema = z.object({
  maxAutomatedRecoveryAmountINR: z.number().positive(),
  maxAutomatedRetries: z.number().int().min(1),
  maxRecoveryInterventions: z.number().int().min(1),
  minimumConfidenceForAutomation: z.number().min(0).max(1),
  minimumConfidenceForConservativeEvaluation: z.number().min(0).max(1),
  blockCriticalAutomation: z.boolean(),
  blockNonRecoverable: z.boolean(),
  policyVersion: z.string().default("1.0.0"),
});

export const policyDecisionSchema = z.object({
  id: z.string().optional(),
  eventId: z.string().min(1),
  recommendationId: z.string().optional(),
  decision: policyDecisionOutcomeEnum,
  originalAction: recoveryActionEnum,
  approvedAction: recoveryActionEnum,
  reasons: z.array(z.string()),
  ruleResults: z.array(ruleResultSchema),
  requiresHumanReview: z.boolean(),
  requiresCustomerAction: z.boolean(),
  shouldStopAutomation: z.boolean(),
  policyVersion: z.string(),
  evaluatedAt: z.string(),
});

export const policyEvaluateRequestSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  config: policyConfigSchema.partial().optional(),
});

export type ValidatedPolicyDecision = z.infer<typeof policyDecisionSchema>;
