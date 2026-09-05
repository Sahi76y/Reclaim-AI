/**
 * Core Domain Types for ReclaimAI — AI Revenue Recovery Agent
 */

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskCategory =
  | "FAILED_TRANSACTION"
  | "PAYMENT_ABANDONMENT"
  | "SUBSCRIPTION_CHURN"
  | "INSUFFICIENT_FUNDS"
  | "GATEWAY_TIMEOUT"
  | "NETWORK_FAILURE";

export type RecoveryRecommendationType =
  | "DUNNING_SMS"
  | "DUNNING_EMAIL"
  | "DYNAMIC_PAYMENT_LINK"
  | "SMART_RETRY"
  | "CHECKOUT_INCENTIVE"
  | "MANUAL_ESCALATION";

export type PolicySafetyDecision =
  "APPROVED" | "REJECTED" | "REQUIRES_HUMAN_APPROVAL" | "QUARANTINED";

export type RecoveryExecutionStatus =
  | "PENDING_POLICY_CHECK"
  | "POLICY_APPROVED"
  | "POLICY_BLOCKED"
  | "AWAITING_HUMAN_APPROVAL"
  | "EXECUTING_RAZORPAY"
  | "RECOVERED"
  | "FAILED"
  | "EXPIRED";

export interface RiskEventDTO {
  id: string;
  merchantId: string;
  category: RiskCategory;
  severity: RiskSeverity;
  amountAtRisk: number; // in minor units (e.g. paise / cents)
  currency: string;
  customerId?: string;
  customerEmail?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RecoveryRecommendationDTO {
  id: string;
  riskEventId: string;
  recommendationType: RecoveryRecommendationType;
  confidenceScore: number; // 0 to 1
  reasoning: string;
  proposedAction: {
    channel?: string;
    suggestedRetryAt?: string;
    suggestedDiscountPercentage?: number;
    paymentLinkExpiryMinutes?: number;
  };
  createdAt: string;
}

export interface PolicyValidationResultDTO {
  decision: PolicySafetyDecision;
  rulesPassed: string[];
  rulesViolated: string[];
  requiresHumanReview: boolean;
  notes: string;
}

export interface AuditLogDTO {
  id: string;
  merchantId: string;
  actor: "AI_AGENT" | "POLICY_ENGINE" | "HUMAN_OPERATOR" | "RAZORPAY_WEBHOOK";
  action: string;
  riskEventId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}
