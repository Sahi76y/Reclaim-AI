import type { PolicyEvaluationInput, RuleResult } from "./types";
import type { PolicyConfig } from "./config";

/**
 * RULE 1 — RECOVERY ELIGIBILITY
 * Unconditionally blocks events flagged as ineligible.
 */
export function evaluateRecoveryEligibility(
  input: PolicyEvaluationInput,
  config?: PolicyConfig
): RuleResult {
  void config;
  const { event } = input;
  if (!event.isRecoveryEligible) {
    return {
      ruleId: "RULE_01_ELIGIBILITY",
      ruleName: "Recovery Eligibility Check",
      passed: false,
      reason: "Automated recovery is not permitted for this event.",
      suggestedDecision: "BLOCK",
      suggestedAction: "NONE",
      shouldStopAutomation: true,
    };
  }

  return {
    ruleId: "RULE_01_ELIGIBILITY",
    ruleName: "Recovery Eligibility Check",
    passed: true,
    reason: "Event is verified as eligible for automated recovery consideration.",
  };
}

/**
 * RULE 2 — NON-RECOVERABLE CATEGORY
 * Hard blocks failures identified under non-recoverable categories (stolen card, closed account).
 */
export function evaluateNonRecoverableCategory(
  input: PolicyEvaluationInput,
  config: PolicyConfig
): RuleResult {
  const { event } = input;
  if (config.blockNonRecoverable && event.category === "NON_RECOVERABLE") {
    return {
      ruleId: "RULE_02_NON_RECOVERABLE",
      ruleName: "Non-Recoverable Category Gate",
      passed: false,
      reason:
        "Failure is classified as non-recoverable (e.g. permanently blocked, stolen card, or fraudulent attempt). Automated recovery is stopped.",
      suggestedDecision: "BLOCK",
      suggestedAction: "NONE",
      shouldStopAutomation: true,
    };
  }

  return {
    ruleId: "RULE_02_NON_RECOVERABLE",
    ruleName: "Non-Recoverable Category Gate",
    passed: true,
    reason: `Failure category (${event.category}) is potentially actionable.`,
  };
}

/**
 * RULE 3 — MAX TRANSACTION AMOUNT
 * Escalates high-value transactions beyond the automated recovery threshold.
 */
export function evaluateMaxTransactionAmount(
  input: PolicyEvaluationInput,
  config: PolicyConfig
): RuleResult {
  const { event } = input;
  if (event.amountAtRiskINR > config.maxAutomatedRecoveryAmountINR) {
    return {
      ruleId: "RULE_03_MAX_AMOUNT",
      ruleName: "Maximum Transaction Amount Limit",
      passed: false,
      reason: `Transaction amount (₹${event.amountAtRiskINR.toLocaleString("en-IN")}) exceeds the automated recovery limit of ₹${config.maxAutomatedRecoveryAmountINR.toLocaleString("en-IN")}. Human review is required to prevent unauthorized financial risk.`,
      suggestedDecision: "ESCALATE",
      suggestedAction: "ESCALATE_HUMAN",
      requiresHumanReview: true,
    };
  }

  return {
    ruleId: "RULE_03_MAX_AMOUNT",
    ruleName: "Maximum Transaction Amount Limit",
    passed: true,
    reason: `Transaction amount (₹${event.amountAtRiskINR.toLocaleString("en-IN")}) is within the automated threshold of ₹${config.maxAutomatedRecoveryAmountINR.toLocaleString("en-IN")}.`,
  };
}

/**
 * RULE 4 — RETRY LIMIT
 * Prevents runaway automated card retries that could trigger card network throttling.
 */
export function evaluateRetryLimit(input: PolicyEvaluationInput, config: PolicyConfig): RuleResult {
  const { event } = input;
  if (event.attemptNumber > config.maxAutomatedRetries) {
    return {
      ruleId: "RULE_04_RETRY_LIMIT",
      ruleName: "Maximum Automated Retries Limit",
      passed: false,
      reason: `Automatic retry limit reached (${event.attemptNumber} attempts > max of ${config.maxAutomatedRetries}). Further retries are stopped to prevent repeated charges.`,
      suggestedDecision: "ESCALATE",
      suggestedAction: "ESCALATE_HUMAN",
      shouldStopAutomation: true,
      requiresHumanReview: true,
    };
  }

  return {
    ruleId: "RULE_04_RETRY_LIMIT",
    ruleName: "Maximum Automated Retries Limit",
    passed: true,
    reason: `Current attempt count (${event.attemptNumber}) is within the allowed limit of ${config.maxAutomatedRetries}.`,
  };
}

/**
 * RULE 5 — RECOVERY INTERVENTION LIMIT
 * Caps customer contact points to prevent merchant brand fatigue.
 */
export function evaluateInterventionLimit(
  input: PolicyEvaluationInput,
  config: PolicyConfig
): RuleResult {
  const { event } = input;
  if (event.recoveryAttemptsCount >= config.maxRecoveryInterventions) {
    return {
      ruleId: "RULE_05_INTERVENTION_LIMIT",
      ruleName: "Recovery Intervention Cap",
      passed: false,
      reason: "Maximum automated recovery interventions reached.",
      suggestedDecision: "ESCALATE",
      suggestedAction: "ESCALATE_HUMAN",
      shouldStopAutomation: true,
      requiresHumanReview: true,
    };
  }

  return {
    ruleId: "RULE_05_INTERVENTION_LIMIT",
    ruleName: "Recovery Intervention Cap",
    passed: true,
    reason: `Prior recovery interventions (${event.recoveryAttemptsCount}) are within the safety cap of ${config.maxRecoveryInterventions}.`,
  };
}

/**
 * RULE 6 — AI CONFIDENCE POLICY
 * Requires human review when model confidence is low (<0.60) and enforces conservative
 * handling when confidence is moderate (0.60–0.79).
 */
export function evaluateConfidencePolicy(
  input: PolicyEvaluationInput,
  config: PolicyConfig
): RuleResult {
  const { recommendation, event } = input;
  const conf = recommendation.recommendation.confidence;

  if (conf < config.minimumConfidenceForConservativeEvaluation) {
    return {
      ruleId: "RULE_06_CONFIDENCE",
      ruleName: "AI Confidence Safety Policy",
      passed: false,
      reason:
        "The AI is not confident enough for automatic recovery, so this case needs human review.",
      suggestedDecision: "ESCALATE",
      suggestedAction: "ESCALATE_HUMAN",
      requiresHumanReview: true,
    };
  }

  if (conf < config.minimumConfidenceForAutomation) {
    // Conservative evaluation: if action is autonomous retry on a subsequent attempt, switch to link
    if (recommendation.recommendation.action === "SMART_RETRY" && event.attemptNumber > 1) {
      return {
        ruleId: "RULE_06_CONFIDENCE",
        ruleName: "AI Confidence Safety Policy",
        passed: false,
        reason: `AI confidence is moderate (${Math.round(conf * 100)}%). Conservative policy requires customer payment link instead of repeated autonomous retry.`,
        suggestedDecision: "MODIFY",
        suggestedAction: "DYNAMIC_PAYMENT_LINK",
      };
    }

    return {
      ruleId: "RULE_06_CONFIDENCE",
      ruleName: "AI Confidence Safety Policy",
      passed: true,
      reason: `AI confidence (${Math.round(conf * 100)}%) qualifies under conservative evaluation criteria.`,
    };
  }

  return {
    ruleId: "RULE_06_CONFIDENCE",
    ruleName: "AI Confidence Safety Policy",
    passed: true,
    reason: `AI confidence (${Math.round(conf * 100)}%) meets normal automation standards.`,
  };
}

/**
 * RULE 7 — HIGH-RISK CUSTOMER TIER
 * Prevents aggressive automated actions on churn-risk accounts.
 */
export function evaluateHighRiskCustomer(
  input: PolicyEvaluationInput,
  config?: PolicyConfig
): RuleResult {
  void config;
  const { event, recommendation } = input;
  if (event.customerTier === "CHURN_RISK") {
    // If recommended action is repeated autonomous retry or already had interventions
    if (recommendation.recommendation.action === "SMART_RETRY" || event.recoveryAttemptsCount > 0) {
      return {
        ruleId: "RULE_07_CHURN_RISK",
        ruleName: "Customer Risk Tier Safeguard",
        passed: false,
        reason:
          "Customer is flagged as CHURN_RISK with repeated failures. Automated recovery is paused to allow high-touch merchant concierge follow-up.",
        suggestedDecision: "ESCALATE",
        suggestedAction: "ESCALATE_HUMAN",
        requiresHumanReview: true,
      };
    }
  }

  return {
    ruleId: "RULE_07_CHURN_RISK",
    ruleName: "Customer Risk Tier Safeguard",
    passed: true,
    reason: `Customer risk tier (${event.customerTier}) is safe for standard recovery policy.`,
  };
}

/**
 * RULE 8 — CRITICAL SEVERITY
 * Blocks autonomous action on CRITICAL severity events unless human approval is given.
 */
export function evaluateCriticalSeverity(
  input: PolicyEvaluationInput,
  config: PolicyConfig
): RuleResult {
  const { event } = input;
  if (config.blockCriticalAutomation && event.severity === "CRITICAL") {
    return {
      ruleId: "RULE_08_CRITICAL_SEVERITY",
      ruleName: "Critical Incident Severity Guard",
      passed: false,
      reason:
        "Incident severity is CRITICAL. Autonomous execution is prohibited without human supervisor sign-off.",
      suggestedDecision: "ESCALATE",
      suggestedAction: "ESCALATE_HUMAN",
      requiresHumanReview: true,
    };
  }

  return {
    ruleId: "RULE_08_CRITICAL_SEVERITY",
    ruleName: "Critical Incident Severity Guard",
    passed: true,
    reason: `Event severity (${event.severity}) is eligible for automated processing.`,
  };
}

/**
 * RULE 9 — ACTION-SPECIFIC FEASIBILITY
 * Verifies that the recommended action matches operational reality.
 */
export function evaluateActionFeasibility(
  input: PolicyEvaluationInput,
  config?: PolicyConfig
): RuleResult {
  void config;
  const { event, recommendation } = input;
  const action = recommendation.recommendation.action;

  if (action === "SMART_RETRY") {
    if (event.category === "CUSTOMER_ACTION_REQUIRED") {
      return {
        ruleId: "RULE_09_ACTION_FEASIBILITY",
        ruleName: "Action Feasibility Verification",
        passed: false,
        reason:
          "Autonomous retry cannot complete an authentication-blocked payment. Modified to a dynamic payment link requiring customer input.",
        suggestedDecision: "MODIFY",
        suggestedAction: "DYNAMIC_PAYMENT_LINK",
      };
    }
  }

  return {
    ruleId: "RULE_09_ACTION_FEASIBILITY",
    ruleName: "Action Feasibility Verification",
    passed: true,
    reason: `Recommended action (${action}) is operationally sound for payment method ${event.paymentMethod}.`,
  };
}

export const ALL_POLICY_RULES = [
  evaluateRecoveryEligibility,
  evaluateNonRecoverableCategory,
  evaluateMaxTransactionAmount,
  evaluateRetryLimit,
  evaluateInterventionLimit,
  evaluateConfidencePolicy,
  evaluateHighRiskCustomer,
  evaluateCriticalSeverity,
  evaluateActionFeasibility,
];
