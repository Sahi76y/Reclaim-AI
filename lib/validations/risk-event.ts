import { z } from "zod";

export const riskCategoryEnum = z.enum([
  "TEMPORARY_PAYMENT_FAILURE",
  "INSUFFICIENT_FUNDS",
  "CUSTOMER_ACTION_REQUIRED",
  "REPEATED_PAYMENT_FAILURE",
  "ABANDONED_CHECKOUT",
  "NON_RECOVERABLE",
]);

export const riskSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const paymentMethodEnum = z.enum(["UPI", "CARD", "NETBANKING", "WALLET", "EMI"]);
export const customerTierEnum = z.enum(["VIP", "REGULAR", "NEW", "CHURN_RISK"]);

/**
 * Zod validation schema for incoming risk events (Webhook ingestion)
 */
export const riskEventIngestionSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  merchantId: z.string().min(1, "Merchant ID is required"),
  category: riskCategoryEnum,
  severity: riskSeverityEnum.default("MEDIUM"),
  amountAtRisk: z
    .number()
    .int("Amount must be an integer in minor currency units (paise)")
    .positive("Amount must be greater than 0"),
  currency: z.string().default("INR"),
  customerId: z.string().min(1, "Customer ID is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  orderId: z.string().min(1, "Order ID is required"),
  paymentMethod: paymentMethodEnum.default("UPI"),
  failureCode: z.string().min(1, "Failure code is required"),
  failureReason: z.string().min(1, "Failure reason is required"),
  attemptNumber: z.number().int().min(1).default(1),
  recoveryAttemptsCount: z.number().int().min(0).default(0),
  customerTier: customerTierEnum.default("REGULAR"),
  isSubscription: z.boolean().default(false),
  subscriptionPlanId: z.string().optional(),
  isRecoveryEligible: z.boolean().default(true),
  previousSuccessCount: z.number().int().min(0).default(0),
  previousFailureCount: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

export type RiskEventIngestionPayload = z.infer<typeof riskEventIngestionSchema>;
