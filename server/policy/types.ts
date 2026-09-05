import type {
  AIInputDTO,
  RecoveryActionType,
  RecoveryRecommendationOutput,
} from "@/server/ai/types";
import type { PolicyConfig } from "./config";

export type PolicyDecisionOutcome = "ALLOW" | "MODIFY" | "ESCALATE" | "BLOCK";

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  reason: string;
  suggestedAction?: RecoveryActionType;
  suggestedDecision?: PolicyDecisionOutcome;
  requiresHumanReview?: boolean;
  shouldStopAutomation?: boolean;
}

export interface PolicyEvaluationInput {
  event: AIInputDTO;
  recommendation: RecoveryRecommendationOutput;
}

export interface PolicyDecision {
  id?: string;
  eventId: string;
  recommendationId?: string;
  decision: PolicyDecisionOutcome;
  originalAction: RecoveryActionType;
  approvedAction: RecoveryActionType;
  reasons: string[];
  ruleResults: RuleResult[];
  requiresHumanReview: boolean;
  requiresCustomerAction: boolean;
  shouldStopAutomation: boolean;
  policyVersion: string;
  evaluatedAt: string;
}

export type PolicyRuleEvaluator = (
  input: PolicyEvaluationInput,
  config: PolicyConfig
) => RuleResult;
