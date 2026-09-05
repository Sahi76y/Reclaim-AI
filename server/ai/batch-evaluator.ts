import { getRiskEvents, getAIInputByEventId } from "@/server/risk-events/repository";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import type {
  BatchEvaluationResult,
  RecoveryActionType,
  RecoveryRecommendationOutput,
} from "./types";
import { assessConfidencePolicy } from "./schemas";

export interface BatchEvaluationOptions {
  limit?: number;
  offset?: number;
  merchantId?: string;
  provider?: AIProvider;
}

/**
 * Runs the AI recommendation engine over a batch of synthetic risk events.
 * Aggregates diagnostic patterns and confidence distributions.
 *
 * NOTE: Does NOT calculate recovered revenue (which belongs to Step 5 execution simulation).
 */
export async function evaluateBatchRecommendations(
  options?: BatchEvaluationOptions
): Promise<BatchEvaluationResult> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  const provider = options?.provider ?? new MockAIProvider();

  // Retrieve raw events
  const events = await getRiskEvents({
    limit,
    offset,
    merchantId: options?.merchantId,
  });

  const recommendations: RecoveryRecommendationOutput[] = [];

  const recommendationsByAction: Record<RecoveryActionType, number> = {
    SMART_RETRY: 0,
    CUSTOMER_DUNNING: 0,
    DYNAMIC_PAYMENT_LINK: 0,
    ESCALATE_HUMAN: 0,
    NONE: 0,
  };

  const confidenceDistribution = {
    high: 0,
    moderate: 0,
    low: 0,
  };

  let totalConfidence = 0;
  let humanReviewCount = 0;
  let stopAutomationCount = 0;

  for (const event of events) {
    // Project only AI-safe input fields through the secure repository boundary
    const aiInput = await getAIInputByEventId(event.id);
    if (!aiInput) continue;

    const rec = await provider.diagnoseAndRecommend(aiInput);
    recommendations.push(rec);

    // Aggregate actions
    recommendationsByAction[rec.recommendation.action] =
      (recommendationsByAction[rec.recommendation.action] || 0) + 1;

    // Aggregate confidence
    const confAssessment = assessConfidencePolicy(rec.recommendation.confidence);
    if (confAssessment.tier === "HIGH") confidenceDistribution.high += 1;
    else if (confAssessment.tier === "MODERATE") confidenceDistribution.moderate += 1;
    else confidenceDistribution.low += 1;

    totalConfidence += rec.recommendation.confidence;

    if (rec.safety.requiresHumanReview) {
      humanReviewCount += 1;
    }

    if (rec.safety.shouldStopAutomation) {
      stopAutomationCount += 1;
    }
  }

  const totalProcessed = recommendations.length;
  const averageConfidence =
    totalProcessed > 0 ? Math.round((totalConfidence / totalProcessed) * 100) / 100 : 0;

  return {
    totalProcessed,
    recommendationsByAction,
    confidenceDistribution,
    averageConfidence,
    lowConfidenceCount: confidenceDistribution.low,
    humanReviewCount,
    stopAutomationCount,
    recommendations,
  };
}
