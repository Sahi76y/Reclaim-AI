import { getAIInputByEventId, saveRecoveryRecommendation } from "@/server/risk-events/repository";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import type { AIInputDTO, RecoveryRecommendationOutput } from "./types";
import { recoveryRecommendationSchema } from "./schemas";

export * from "./types";
export * from "./provider";
export * from "./schemas";
export * from "./prompts";
export * from "./mock-provider";
export * from "./openai-provider";
export * from "./batch-evaluator";
export {
  getAIInputByEventId,
  saveRecoveryRecommendation,
  getRecoveryRecommendationByEventId,
} from "@/server/risk-events/repository";

export class RiskEventNotFoundError extends Error {
  constructor(public readonly eventId: string) {
    super(`RiskEvent with ID '${eventId}' was not found.`);
    this.name = "RiskEventNotFoundError";
  }
}

/**
 * Factory for instantiating the requested AIProvider.
 * Defaults to MockAIProvider for offline testing and local development.
 */
export function getAIProvider(providerName?: "mock" | "openai"): AIProvider {
  const selected = providerName ?? (process.env.AI_PROVIDER === "openai" ? "openai" : "mock");

  if (selected === "openai") {
    return new OpenAIProvider();
  }

  return new MockAIProvider();
}

export interface RecommendationOptions {
  provider?: "mock" | "openai";
}

/**
 * Main AI Reasoning Orchestrator:
 * 1. Loads ONLY AI-safe input features from the repository.
 * 2. Invokes the selected AIProvider.
 * 3. Enforces Zod validation on model response.
 * 4. Persists the recommendation to the database.
 * 5. Prepares a structured audit logging record.
 */
export async function diagnoseAndRecommendEvent(
  eventId: string,
  options?: RecommendationOptions
): Promise<RecoveryRecommendationOutput> {
  // 1. Fetch strictly AI-safe fields (Ground truth & customer email excluded)
  const aiInput: AIInputDTO | null = await getAIInputByEventId(eventId);

  if (!aiInput) {
    throw new RiskEventNotFoundError(eventId);
  }

  // 2. Select AI Provider
  const provider = getAIProvider(options?.provider);

  // 3. Request reasoning output
  const rawOutput = await provider.diagnoseAndRecommend(aiInput);

  // 4. Validate output with Zod
  const validated = recoveryRecommendationSchema.parse(rawOutput);

  // 5. Persist the recommendation
  await saveRecoveryRecommendation({
    riskEventId: validated.eventId,
    action: validated.recommendation.action,
    confidenceScore: validated.recommendation.confidence,
    reasoning: validated.recommendation.reason,
    diagnosisSummary: validated.diagnosis.summary,
    likelyCause: validated.diagnosis.likelyCause,
    severity: validated.diagnosis.severity,
    expectedBenefit: validated.recommendation.expectedBenefit,
    safetyFlags: validated.safety,
    provider: validated.provider,
    model: validated.model,
    createdAt: new Date(validated.generatedAt),
  });

  // 6. Audit preparation log (structured, PII-free, no money recovered claim)
  console.log(
    `[RECOVERY_ADVISOR_AUDIT] Event: ${validated.eventId} | Action: ${validated.recommendation.action} | Confidence: ${validated.recommendation.confidence} | Provider: ${validated.provider}/${validated.model} | HumanReviewRequired: ${validated.safety.requiresHumanReview}`
  );

  return validated;
}
