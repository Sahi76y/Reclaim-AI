/**
 * Core Type Definitions for the ReclaimAI Reasoning Layer
 *
 * ARCHITECTURAL RULE:
 * AIInputDTO strictly omits all EventGroundTruth fields and customer PII (e.g. email).
 * The AI layer must reason solely on operational features available at the moment of failure.
 */

export type RecoveryActionType =
  "SMART_RETRY" | "CUSTOMER_DUNNING" | "DYNAMIC_PAYMENT_LINK" | "ESCALATE_HUMAN" | "NONE";

export type DiagnosisSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * AI-safe input DTO projected from RiskEvent
 */
export interface AIInputDTO {
  eventId: string;
  amountAtRisk: number; // in paise
  amountAtRiskINR: number; // in INR
  currency: string;
  category: string;
  severity: DiagnosisSeverity;
  paymentMethod: string;
  failureCode: string;
  failureReason: string;
  attemptNumber: number;
  recoveryAttemptsCount: number;
  customerTier: string;
  isSubscription: boolean;
  subscriptionPlanId?: string;
  previousSuccessCount: number;
  previousFailureCount: number;
  isRecoveryEligible: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Structured output produced by the AI reasoning engine
 */
export interface RecoveryRecommendationOutput {
  eventId: string;

  diagnosis: {
    summary: string;
    failureType: string;
    likelyCause: string;
    severity: DiagnosisSeverity;
  };

  recommendation: {
    action: RecoveryActionType;
    reason: string;
    confidence: number; // numeric value between 0 and 1
    expectedBenefit: string;
  };

  safety: {
    requiresCustomerAction: boolean;
    requiresHumanReview: boolean;
    shouldStopAutomation: boolean;
  };

  provider: string;
  model: string;
  generatedAt: string;
}

/**
 * Batch recommendation summary
 */
export interface BatchEvaluationResult {
  totalProcessed: number;
  recommendationsByAction: Record<RecoveryActionType, number>;
  confidenceDistribution: {
    high: number; // >= 0.80
    moderate: number; // 0.60 - 0.79
    low: number; // < 0.60
  };
  averageConfidence: number;
  lowConfidenceCount: number;
  humanReviewCount: number;
  stopAutomationCount: number;
  recommendations: RecoveryRecommendationOutput[];
}
