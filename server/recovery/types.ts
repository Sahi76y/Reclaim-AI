/**
 * Recovery Execution Engine Types
 *
 * ARCHITECTURAL SAFETY BOUNDARY:
 * - The executor receives ONLY the approvedAction from PolicyDecision.
 * - The executor must NEVER receive EventGroundTruth.
 * - recoveredAmount must NEVER exceed amountAtRisk.
 */

export type RecoveryAction =
  "SMART_RETRY" | "CUSTOMER_DUNNING" | "DYNAMIC_PAYMENT_LINK" | "ESCALATE_HUMAN" | "NONE";

export type RecoveryExecutionStatus = "SUCCESS" | "FAILED" | "PENDING" | "SKIPPED" | "ESCALATED";

export type RecoveryExecutionProvider = "SIMULATOR" | "RAZORPAY_TEST";

export interface RecoveryExecutionInput {
  eventId: string;
  policyDecisionId: string;
  approvedAction: RecoveryAction;
  amountAtRisk: number; // in minor currency units (paise)
  currency: string;
  idempotencyKey: string;
  providerPreference?: RecoveryExecutionProvider;
  metadata?: Record<string, unknown>;
}

export interface RecoveryExecutionResult {
  executionId: string;
  eventId: string;
  policyDecisionId: string;
  action: RecoveryAction;
  status: RecoveryExecutionStatus;
  provider: RecoveryExecutionProvider;
  providerReference?: string;
  recoveredAmount: number; // in minor currency units (paise), <= amountAtRisk
  currency: string;
  failureReason?: string;
  executedAt: string;
  metadata?: Record<string, unknown>;
}

export interface RecoveryCommunicationTaskDTO {
  id: string;
  riskEventId: string;
  policyDecisionId: string;
  customerReference: string;
  action: string;
  reason: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  createdAt: string;
}

export interface HumanReviewTaskDTO {
  id: string;
  riskEventId: string;
  policyDecisionId: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

export interface RecoveryExecutor {
  execute(input: RecoveryExecutionInput): Promise<RecoveryExecutionResult>;
}

export interface ExecutionMetricsDTO {
  totalExecutionAttempts: number;
  successfulRecoveries: number;
  failedExecutions: number;
  pendingExecutions: number;
  escalations: number;
  skippedExecutions: number;
  totalAmountAttemptedPaise: number;
  totalAmountAttemptedINR: number;
  totalAmountRecoveredPaise: number;
  totalAmountRecoveredINR: number;
  recoverySuccessRate: number; // percentage 0 - 100
  recoveryRateByAction: Record<
    RecoveryAction,
    {
      attempts: number;
      successes: number;
      recoveredPaise: number;
      recoveredINR: number;
      successRate: number;
    }
  >;
}
