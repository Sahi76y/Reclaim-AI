import type { RiskCategoryType } from "@/server/data/synthetic-generator";
import type { RecoveryActionType } from "@/server/ai/types";
import type { RecoveryExecutionProvider } from "@/server/recovery/types";

export type { RiskCategoryType, RecoveryActionType, RecoveryExecutionProvider };

export interface RevenueMetrics {
  totalRevenueAtRiskPaise: number;
  totalRevenueAtRiskINR: number;
  totalGroundTruthRecoverablePaise: number;
  totalGroundTruthRecoverableINR: number;
  totalAIRecommendedValuePaise: number;
  totalAIRecommendedValueINR: number;
  totalPolicyApprovedValuePaise: number;
  totalPolicyApprovedValueINR: number;
  totalActuallyRecoveredPaise: number;
  totalActuallyRecoveredINR: number;
  recoveryRateAgainstRecoverable: number; // percentage (0 - 100)
  recoveryRateAgainstTotalRisk: number; // percentage (0 - 100)
}

export interface DecisionMetrics {
  totalCasesEvaluated: number;
  casesRecommendedForRecovery: number;
  casesApprovedForAutonomousRecovery: number;
  casesModifiedByPolicy: number;
  casesEscalatedToHuman: number;
  casesBlocked: number;
  casesWithNoRecoveryAction: number;
}

export interface SafetyMetrics {
  unsafeActionsPrevented: number;
  nonRecoverableCasesBlocked: number;
  excessiveRetryCasesEscalated: number;
  highValueCasesEscalated: number;
  lowConfidenceCasesEscalated: number;
  falseRecoveryAttempts: number;
  policyBlockedRecoveryOpportunities: number;
}

export interface StrategyBreakdownItem {
  action: RecoveryActionType;
  caseCount: number;
  amountAtRiskPaise: number;
  amountAtRiskINR: number;
  recommendedAmountPaise: number;
  recommendedAmountINR: number;
  approvedAmountPaise: number;
  approvedAmountINR: number;
  recoveredAmountPaise: number;
  recoveredAmountINR: number;
  recoveryRate: number; // percentage of amountAtRisk recovered
}

export interface RiskCategoryBreakdownItem {
  category: RiskCategoryType;
  caseCount: number;
  amountAtRiskPaise: number;
  amountAtRiskINR: number;
  recoverableAmountPaise: number;
  recoverableAmountINR: number;
  recommendedAmountPaise: number;
  recommendedAmountINR: number;
  approvedAmountPaise: number;
  approvedAmountINR: number;
  recoveredAmountPaise: number;
  recoveredAmountINR: number;
  recoveryRate: number; // percentage of amountAtRisk recovered
}

export interface BaselineMetrics {
  recoveredAmountPaise: number;
  recoveredAmountINR: number;
  recoveryRateAgainstRecoverable: number;
  recoveryRateAgainstTotalRisk: number;
  recoveryAttempts: number;
  escalations: number;
  unsafeActionsPrevented: number;
}

export interface BaselineComparison {
  baseline: BaselineMetrics;
  reclaimai: {
    recoveredAmountPaise: number;
    recoveredAmountINR: number;
    recoveryRateAgainstRecoverable: number;
    recoveryRateAgainstTotalRisk: number;
    recoveryAttempts: number;
    escalations: number;
    unsafeActionsPrevented: number;
  };
  lift: {
    netRecoveredAmountPaise: number;
    netRecoveredAmountINR: number;
    recoveryRateDiff: number; // ReclaimAI rate - Baseline rate
    liftPercentage: number; // % increase over baseline recovered revenue
    summary: string;
  };
}

export interface ProviderModeMetadata {
  providerMode: "RAZORPAY_TEST_SIMULATION" | "RAZORPAY_TEST_API" | "SIMULATOR";
  label: string;
  isRealMoneyMoved: false;
  isLiveApi: boolean;
  disclaimer: string;
  razorpayMode: "test";
}

export interface CaseEvaluationRecord {
  eventId: string;
  category: RiskCategoryType;
  amountAtRiskINR: number;
  groundTruth: {
    isRecoverable: boolean;
    recoverableAmountINR: number;
    expectedAction: string;
    simulatedOutcome: string;
  };
  aiRecommendation: {
    action: RecoveryActionType;
    confidence: number;
  };
  policyDecision: {
    decision: string;
    approvedAction: RecoveryActionType;
  };
  recoveryExecution: {
    status: string;
    provider: string;
    recoveredAmountINR: number;
  };
  evaluationFlags: {
    recovered: boolean;
    isFalseRecoveryAttempt: boolean;
    isPolicyBlockedOpportunity: boolean;
    isUnsafePrevented: boolean;
  };
}

export interface EvaluationResult {
  evaluationId: string;
  evaluatedAt: string;
  datasetSize: number;
  durationMs: number;
  providerMode: ProviderModeMetadata;
  revenueSummary: RevenueMetrics;
  decisionSummary: DecisionMetrics;
  safetySummary: SafetyMetrics;
  strategyBreakdown: Record<RecoveryActionType, StrategyBreakdownItem>;
  riskCategoryBreakdown: Record<RiskCategoryType, RiskCategoryBreakdownItem>;
  baselineComparison: BaselineComparison;
  cases?: CaseEvaluationRecord[];
}

export interface EvaluationOptions {
  sampleSize?: number;
  merchantId?: string;
  providerPreference?: RecoveryExecutionProvider;
  includeCaseRecords?: boolean;
}
