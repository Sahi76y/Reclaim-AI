import { z } from "zod";

export const recoveryActionEnum = z.enum([
  "SMART_RETRY",
  "CUSTOMER_DUNNING",
  "DYNAMIC_PAYMENT_LINK",
  "ESCALATE_HUMAN",
  "NONE",
]);

export const recoveryExecutionStatusEnum = z.enum([
  "SUCCESS",
  "FAILED",
  "PENDING",
  "SKIPPED",
  "ESCALATED",
]);

export const recoveryProviderEnum = z.enum(["SIMULATOR", "RAZORPAY_TEST"]);

export const recoveryExecutionInputSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  policyDecisionId: z.string().min(1, "Policy Decision ID is required"),
  approvedAction: recoveryActionEnum,
  amountAtRisk: z.number().int().nonnegative("Amount at risk must be a non-negative integer"),
  currency: z.string().default("INR"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
  providerPreference: recoveryProviderEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const recoveryExecutionResultSchema = z.object({
  executionId: z.string().min(1, "Execution ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
  policyDecisionId: z.string().min(1, "Policy Decision ID is required"),
  action: recoveryActionEnum,
  status: recoveryExecutionStatusEnum,
  provider: recoveryProviderEnum,
  providerReference: z.string().optional(),
  recoveredAmount: z.number().int().nonnegative("Recovered amount must be a non-negative integer"),
  currency: z.string().default("INR"),
  failureReason: z.string().optional(),
  executedAt: z.string().datetime({ message: "Executed at must be a valid ISO datetime" }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const executeRequestSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  providerPreference: recoveryProviderEnum.optional(),
});

export const recoveryOutcomeWebhookSchema = z.object({
  executionId: z.string().min(1, "Execution ID is required"),
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
  recoveredAmount: z.number().int().nonnegative("Recovered amount must be non-negative").optional(),
  providerReference: z.string().optional(),
  failureReason: z.string().optional(),
});
