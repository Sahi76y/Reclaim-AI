import { z } from "zod";

export const riskCategoryEnum = z.enum([
  "TEMPORARY_PAYMENT_FAILURE",
  "INSUFFICIENT_FUNDS",
  "CUSTOMER_ACTION_REQUIRED",
  "REPEATED_PAYMENT_FAILURE",
  "ABANDONED_CHECKOUT",
  "NON_RECOVERABLE",
]);

export const recoveryActionEnum = z.enum([
  "SMART_RETRY",
  "DYNAMIC_PAYMENT_LINK",
  "CUSTOMER_DUNNING",
  "ESCALATE_HUMAN",
  "NONE",
]);

export const revenueMetricsSchema = z.object({
  totalRevenueAtRiskPaise: z.number().int().nonnegative(),
  totalRevenueAtRiskINR: z.number().nonnegative(),
  totalGroundTruthRecoverablePaise: z.number().int().nonnegative(),
  totalGroundTruthRecoverableINR: z.number().nonnegative(),
  totalAIRecommendedValuePaise: z.number().int().nonnegative(),
  totalAIRecommendedValueINR: z.number().nonnegative(),
  totalPolicyApprovedValuePaise: z.number().int().nonnegative(),
  totalPolicyApprovedValueINR: z.number().nonnegative(),
  totalActuallyRecoveredPaise: z.number().int().nonnegative(),
  totalActuallyRecoveredINR: z.number().nonnegative(),
  recoveryRateAgainstRecoverable: z.number().min(0).max(100),
  recoveryRateAgainstTotalRisk: z.number().min(0).max(100),
});

export const decisionMetricsSchema = z.object({
  totalCasesEvaluated: z.number().int().nonnegative(),
  casesRecommendedForRecovery: z.number().int().nonnegative(),
  casesApprovedForAutonomousRecovery: z.number().int().nonnegative(),
  casesModifiedByPolicy: z.number().int().nonnegative(),
  casesEscalatedToHuman: z.number().int().nonnegative(),
  casesBlocked: z.number().int().nonnegative(),
  casesWithNoRecoveryAction: z.number().int().nonnegative(),
});

export const safetyMetricsSchema = z.object({
  unsafeActionsPrevented: z.number().int().nonnegative(),
  nonRecoverableCasesBlocked: z.number().int().nonnegative(),
  excessiveRetryCasesEscalated: z.number().int().nonnegative(),
  highValueCasesEscalated: z.number().int().nonnegative(),
  lowConfidenceCasesEscalated: z.number().int().nonnegative(),
  falseRecoveryAttempts: z.number().int().nonnegative(),
  policyBlockedRecoveryOpportunities: z.number().int().nonnegative(),
});

export const strategyBreakdownItemSchema = z.object({
  action: recoveryActionEnum,
  caseCount: z.number().int().nonnegative(),
  amountAtRiskPaise: z.number().int().nonnegative(),
  amountAtRiskINR: z.number().nonnegative(),
  recommendedAmountPaise: z.number().int().nonnegative(),
  recommendedAmountINR: z.number().nonnegative(),
  approvedAmountPaise: z.number().int().nonnegative(),
  approvedAmountINR: z.number().nonnegative(),
  recoveredAmountPaise: z.number().int().nonnegative(),
  recoveredAmountINR: z.number().nonnegative(),
  recoveryRate: z.number().min(0).max(100),
});

export const riskCategoryBreakdownItemSchema = z.object({
  category: riskCategoryEnum,
  caseCount: z.number().int().nonnegative(),
  amountAtRiskPaise: z.number().int().nonnegative(),
  amountAtRiskINR: z.number().nonnegative(),
  recoverableAmountPaise: z.number().int().nonnegative(),
  recoverableAmountINR: z.number().nonnegative(),
  recommendedAmountPaise: z.number().int().nonnegative(),
  recommendedAmountINR: z.number().nonnegative(),
  approvedAmountPaise: z.number().int().nonnegative(),
  approvedAmountINR: z.number().nonnegative(),
  recoveredAmountPaise: z.number().int().nonnegative(),
  recoveredAmountINR: z.number().nonnegative(),
  recoveryRate: z.number().min(0).max(100),
});

export const baselineMetricsSchema = z.object({
  recoveredAmountPaise: z.number().int().nonnegative(),
  recoveredAmountINR: z.number().nonnegative(),
  recoveryRateAgainstRecoverable: z.number().min(0).max(100),
  recoveryRateAgainstTotalRisk: z.number().min(0).max(100),
  recoveryAttempts: z.number().int().nonnegative(),
  escalations: z.number().int().nonnegative(),
  unsafeActionsPrevented: z.number().int().nonnegative(),
});

export const baselineComparisonSchema = z.object({
  baseline: baselineMetricsSchema,
  reclaimai: z.object({
    recoveredAmountPaise: z.number().int().nonnegative(),
    recoveredAmountINR: z.number().nonnegative(),
    recoveryRateAgainstRecoverable: z.number().min(0).max(100),
    recoveryRateAgainstTotalRisk: z.number().min(0).max(100),
    recoveryAttempts: z.number().int().nonnegative(),
    escalations: z.number().int().nonnegative(),
    unsafeActionsPrevented: z.number().int().nonnegative(),
  }),
  lift: z.object({
    netRecoveredAmountPaise: z.number().int(),
    netRecoveredAmountINR: z.number(),
    recoveryRateDiff: z.number(),
    liftPercentage: z.number(),
    summary: z.string(),
  }),
});

export const providerModeMetadataSchema = z.object({
  providerMode: z.enum(["RAZORPAY_TEST_SIMULATION", "RAZORPAY_TEST_API", "SIMULATOR"]),
  label: z.string(),
  isRealMoneyMoved: z.literal(false),
  isLiveApi: z.boolean(),
  disclaimer: z.string(),
  razorpayMode: z.literal("test"),
});

export const caseEvaluationRecordSchema = z.object({
  eventId: z.string(),
  category: riskCategoryEnum,
  amountAtRiskINR: z.number().nonnegative(),
  groundTruth: z.object({
    isRecoverable: z.boolean(),
    recoverableAmountINR: z.number().nonnegative(),
    expectedAction: z.string(),
    simulatedOutcome: z.string(),
  }),
  aiRecommendation: z.object({
    action: recoveryActionEnum,
    confidence: z.number().min(0).max(1),
  }),
  policyDecision: z.object({
    decision: z.string(),
    approvedAction: recoveryActionEnum,
  }),
  recoveryExecution: z.object({
    status: z.string(),
    provider: z.string(),
    recoveredAmountINR: z.number().nonnegative(),
  }),
  evaluationFlags: z.object({
    recovered: z.boolean(),
    isFalseRecoveryAttempt: z.boolean(),
    isPolicyBlockedOpportunity: z.boolean(),
    isUnsafePrevented: z.boolean(),
  }),
});

export const evaluationResultSchema = z.object({
  evaluationId: z.string(),
  evaluatedAt: z.string(),
  datasetSize: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  providerMode: providerModeMetadataSchema,
  revenueSummary: revenueMetricsSchema,
  decisionSummary: decisionMetricsSchema,
  safetySummary: safetyMetricsSchema,
  strategyBreakdown: z.record(recoveryActionEnum, strategyBreakdownItemSchema),
  riskCategoryBreakdown: z.record(riskCategoryEnum, riskCategoryBreakdownItemSchema),
  baselineComparison: baselineComparisonSchema,
  cases: z.array(caseEvaluationRecordSchema).optional(),
});

export const runEvaluationRequestSchema = z.object({
  sampleSize: z.number().int().min(1).max(1000).optional(),
  merchantId: z.string().optional(),
  providerPreference: z.enum(["RAZORPAY_TEST", "SIMULATOR"]).optional(),
  includeCaseRecords: z.boolean().optional(),
});
