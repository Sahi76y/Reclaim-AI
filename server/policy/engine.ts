import type {
  PolicyEvaluationInput,
  PolicyDecision,
  RuleResult,
  PolicyDecisionOutcome,
} from "./types";
import type { PolicyConfig } from "./config";
import { getPolicyConfig } from "./config";
import { ALL_POLICY_RULES } from "./rules";
import { policyDecisionSchema } from "./schemas";
import type { RecoveryActionType } from "@/server/ai/types";

/**
 * Deterministic Policy & Safety Guardrail Engine
 *
 * Implements strict, immutable safety rules between AI recommendation output
 * and any future recovery execution.
 *
 * GUARANTEES:
 * - Determinism: Same (event + recommendation + config) produces identical decision.
 * - Non-bypassable: Financial and retry limits cannot be relaxed by model prompt.
 * - Non-overwriting: Keeps originalAction and approvedAction strictly separated.
 */
export class PolicyEngine {
  constructor(private readonly config: PolicyConfig = getPolicyConfig()) {}

  /**
   * Evaluates an AI recommendation against all active policy guardrails.
   */
  evaluate(input: PolicyEvaluationInput): PolicyDecision {
    const { event, recommendation } = input;
    const originalAction: RecoveryActionType = recommendation.recommendation.action;

    const ruleResults: RuleResult[] = [];
    const reasons: string[] = [];

    let hasBlock = false;
    let hasEscalate = false;
    let hasModify = false;
    let modifiedAction: RecoveryActionType | null = null;
    let anyStopsAutomation = false;
    let anyRequiresHumanReview = false;

    // 1. Evaluate every active policy rule
    for (const rule of ALL_POLICY_RULES) {
      const result = rule(input, this.config);
      ruleResults.push(result);

      if (result.shouldStopAutomation) {
        anyStopsAutomation = true;
      }
      if (result.requiresHumanReview) {
        anyRequiresHumanReview = true;
      }

      if (!result.passed) {
        reasons.push(result.reason);

        if (result.suggestedDecision === "BLOCK") {
          hasBlock = true;
        } else if (result.suggestedDecision === "ESCALATE") {
          hasEscalate = true;
        } else if (result.suggestedDecision === "MODIFY") {
          hasModify = true;
          if (result.suggestedAction) {
            modifiedAction = result.suggestedAction;
          }
        }
      }
    }

    // 2. Synthesize final decision based on rule precedence
    let decision: PolicyDecisionOutcome;
    let approvedAction: RecoveryActionType;

    if (hasBlock) {
      decision = "BLOCK";
      approvedAction = "NONE";
      anyStopsAutomation = true;
    } else if (hasEscalate) {
      approvedAction = "ESCALATE_HUMAN";
      anyRequiresHumanReview = true;
      anyStopsAutomation = true;

      if (originalAction === "ESCALATE_HUMAN") {
        decision = "ALLOW";
      } else {
        decision = "ESCALATE";
      }
    } else if (hasModify && modifiedAction && modifiedAction !== originalAction) {
      decision = "MODIFY";
      approvedAction = modifiedAction;
    } else {
      decision = "ALLOW";
      approvedAction = originalAction;
      if (reasons.length === 0) {
        reasons.push("All policy safety guardrails passed. Approved for automated execution.");
      }
    }

    const requiresCustomerAction =
      approvedAction === "DYNAMIC_PAYMENT_LINK" || approvedAction === "CUSTOMER_DUNNING";

    const policyDecision: PolicyDecision = {
      eventId: event.eventId,
      recommendationId: recommendation.eventId,
      decision,
      originalAction,
      approvedAction,
      reasons,
      ruleResults,
      requiresHumanReview: anyRequiresHumanReview || decision === "ESCALATE",
      requiresCustomerAction,
      shouldStopAutomation: anyStopsAutomation || decision === "BLOCK" || approvedAction === "NONE",
      policyVersion: this.config.policyVersion,
      evaluatedAt: new Date().toISOString(),
    };

    // 3. Enforce strict Zod schema validation on output
    return policyDecisionSchema.parse(policyDecision);
  }
}

/**
 * Singleton convenience evaluator
 */
export function evaluatePolicy(
  input: PolicyEvaluationInput,
  configOverrides?: Partial<PolicyConfig>
): PolicyDecision {
  const config = getPolicyConfig(configOverrides);
  const engine = new PolicyEngine(config);
  return engine.evaluate(input);
}
