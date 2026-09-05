import { describe, it, expect } from "vitest";
import { evaluateBatchRecommendations } from "@/server/ai/batch-evaluator";

describe("AI Batch Recommendation Evaluation", () => {
  it("evaluates a batch of synthetic events and aggregates diagnostic distributions", async () => {
    const batchSize = 30;
    const result = await evaluateBatchRecommendations({
      limit: batchSize,
    });

    expect(result.totalProcessed).toBe(batchSize);
    expect(result.recommendations.length).toBe(batchSize);

    // Sum of all actions must equal totalProcessed
    const actionSum = Object.values(result.recommendationsByAction).reduce(
      (acc, count) => acc + count,
      0
    );
    expect(actionSum).toBe(batchSize);

    // Confidence distribution sum must equal totalProcessed
    const confSum =
      result.confidenceDistribution.high +
      result.confidenceDistribution.moderate +
      result.confidenceDistribution.low;
    expect(confSum).toBe(batchSize);

    // Average confidence must be a valid probability
    expect(result.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(result.averageConfidence).toBeLessThanOrEqual(1);

    // Human review counts must be non-negative
    expect(result.humanReviewCount).toBeGreaterThanOrEqual(0);
    expect(result.stopAutomationCount).toBeGreaterThanOrEqual(0);

    // ARCHITECTURAL RULE: Must NOT calculate recovered revenue or leak ground-truth
    const rawResult = result as unknown as Record<string, unknown>;
    expect(rawResult.recoveredRevenue).toBeUndefined();
    expect(rawResult.recoveredAmountPaise).toBeUndefined();
    expect(rawResult.recoverySuccessRate).toBeUndefined();

    for (const rec of result.recommendations) {
      const rawRec = rec as unknown as Record<string, unknown>;
      expect(rawRec.isRecoverable).toBeUndefined();
      expect(rawRec.simulatedOutcome).toBeUndefined();
      expect(rec.recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.recommendation.confidence).toBeLessThanOrEqual(1);
    }
  });
});
