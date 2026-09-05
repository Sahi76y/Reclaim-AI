import type { AIInputDTO } from "@/server/ai/types";
import type { RecoveryActionType } from "@/server/ai/types";
import type { SyntheticGroundTruth } from "@/server/data/synthetic-generator";
import type { BaselineMetrics } from "./types";

export interface BaselineDecision {
  action: RecoveryActionType;
  decision: "ALLOW" | "ESCALATE" | "BLOCK" | "NONE";
  reason: string;
  isUnsafePrevented: boolean;
}

/**
 * Deterministic Rule-Based Baseline Engine (Non-AI)
 *
 * Simulates industry-standard automated retry logic without adaptive AI:
 * - Straightforward pattern: only retries temporary payment failures with low attempt counts.
 * - Adheres to standard safety constraints (retry limits, amount thresholds, non-recoverable blocks).
 * - Has no adaptive recommendation capability for customer dunning or dynamic payment links.
 */
export function evaluateBaselineRule(event: AIInputDTO): BaselineDecision {
  // 1. Safety Guard: Non-recoverable or ineligible
  if (event.category === "NON_RECOVERABLE" || !event.isRecoveryEligible) {
    return {
      action: "NONE",
      decision: "BLOCK",
      reason: "Conservative rule: non-recoverable or ineligible event blocked",
      isUnsafePrevented: true,
    };
  }

  // 2. Safety Guard: Excessive retry attempts (attemptNumber > 2 or recoveryAttemptsCount >= 2)
  if (event.attemptNumber > 2 || event.recoveryAttemptsCount >= 2) {
    return {
      action: "ESCALATE_HUMAN",
      decision: "ESCALATE",
      reason: "Conservative rule: maximum retry attempts exceeded; escalate to human",
      isUnsafePrevented: true,
    };
  }

  // 3. Safety Guard: High value transaction (> ₹50,000 / 5,000,000 paise)
  if (event.amountAtRisk > 5000000) {
    return {
      action: "ESCALATE_HUMAN",
      decision: "ESCALATE",
      reason: "Conservative rule: high value transaction requires manual review",
      isUnsafePrevented: true,
    };
  }

  // 4. Straightforward Temporary Payment Failure -> Automated Retry
  if (event.category === "TEMPORARY_PAYMENT_FAILURE") {
    return {
      action: "SMART_RETRY",
      decision: "ALLOW",
      reason: "Conservative rule: transient network/gateway glitch eligible for basic retry",
      isUnsafePrevented: false,
    };
  }

  // 5. Other categories (INSUFFICIENT_FUNDS, CUSTOMER_ACTION_REQUIRED, REPEATED_PAYMENT_FAILURE, ABANDONED_CHECKOUT):
  // Traditional rule-based engines lack adaptive AI diagnosis and dynamic link generation.
  // VIP customers receive manual escalation; others receive no automated recovery.
  if (event.customerTier === "VIP") {
    return {
      action: "ESCALATE_HUMAN",
      decision: "ESCALATE",
      reason: "Conservative rule: VIP customer payment failure escalated to support",
      isUnsafePrevented: false,
    };
  }

  return {
    action: "NONE",
    decision: "NONE",
    reason: "Conservative rule: non-temporary failure unsupported without adaptive intervention",
    isUnsafePrevented: false,
  };
}

export interface BaselineEvaluationRecord {
  eventId: string;
  action: RecoveryActionType;
  decision: string;
  recoveredAmountPaise: number;
  isAttempt: boolean;
  isEscalation: boolean;
  isUnsafePrevented: boolean;
}

/**
 * Evaluates a set of events under the baseline strategy and compares against ground truth.
 */
export function evaluateBaselineBatch(
  events: AIInputDTO[],
  groundTruths: Map<string, SyntheticGroundTruth>
): {
  metrics: BaselineMetrics;
  records: BaselineEvaluationRecord[];
} {
  let totalRecoveredPaise = 0;
  let totalGroundTruthRecoverablePaise = 0;
  let totalRevenueAtRiskPaise = 0;
  let recoveryAttempts = 0;
  let escalations = 0;
  let unsafeActionsPrevented = 0;

  const records: BaselineEvaluationRecord[] = [];

  for (const event of events) {
    totalRevenueAtRiskPaise += event.amountAtRisk;

    const gt = groundTruths.get(event.eventId);
    if (gt) {
      totalGroundTruthRecoverablePaise += gt.recoverableAmount;
    }

    const baselineDecision = evaluateBaselineRule(event);

    let recoveredPaise = 0;
    const isAttempt = baselineDecision.action === "SMART_RETRY";
    const isEscalation = baselineDecision.action === "ESCALATE_HUMAN";

    if (isAttempt) {
      recoveryAttempts += 1;
      // In baseline retry: recovers if ground truth is recoverable and failure is recoverable via retry
      if (gt && gt.isRecoverable && gt.simulatedOutcome === "RECOVERED_FULL") {
        if (
          gt.expectedRecoveryAction === "SMART_RETRY" ||
          event.category === "TEMPORARY_PAYMENT_FAILURE"
        ) {
          recoveredPaise = Math.min(event.amountAtRisk, gt.recoverableAmount);
          totalRecoveredPaise += recoveredPaise;
        }
      }
    }

    if (isEscalation) {
      escalations += 1;
    }

    if (baselineDecision.isUnsafePrevented) {
      unsafeActionsPrevented += 1;
    }

    records.push({
      eventId: event.eventId,
      action: baselineDecision.action,
      decision: baselineDecision.decision,
      recoveredAmountPaise: recoveredPaise,
      isAttempt,
      isEscalation,
      isUnsafePrevented: baselineDecision.isUnsafePrevented,
    });
  }

  const recoveryRateAgainstRecoverable =
    totalGroundTruthRecoverablePaise > 0
      ? Math.round((totalRecoveredPaise / totalGroundTruthRecoverablePaise) * 10000) / 100
      : 0;

  const recoveryRateAgainstTotalRisk =
    totalRevenueAtRiskPaise > 0
      ? Math.round((totalRecoveredPaise / totalRevenueAtRiskPaise) * 10000) / 100
      : 0;

  return {
    metrics: {
      recoveredAmountPaise: totalRecoveredPaise,
      recoveredAmountINR: Math.round((totalRecoveredPaise / 100) * 100) / 100,
      recoveryRateAgainstRecoverable,
      recoveryRateAgainstTotalRisk,
      recoveryAttempts,
      escalations,
      unsafeActionsPrevented,
    },
    records,
  };
}
