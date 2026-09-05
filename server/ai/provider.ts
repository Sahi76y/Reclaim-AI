import type { AIInputDTO, RecoveryRecommendationOutput } from "./types";

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class OpenAIAPIKeyMissingError extends AIProviderError {
  constructor() {
    super(
      "OPENAI_API_KEY is not configured in the environment. Set OPENAI_API_KEY in .env or switch to the Mock provider.",
      "openai"
    );
    this.name = "OpenAIAPIKeyMissingError";
  }
}

export class MalformedAIOutputError extends AIProviderError {
  constructor(
    provider: string,
    public readonly validationErrors: unknown,
    public readonly rawOutput?: unknown
  ) {
    super(
      `The ${provider} model returned an invalid structured recommendation output that failed schema validation.`,
      provider
    );
    this.name = "MalformedAIOutputError";
  }
}

/**
 * Common abstraction for AI reasoning providers (Mock, OpenAI, etc.)
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;

  /**
   * Evaluates AI-safe input features and produces a validated recovery recommendation.
   */
  diagnoseAndRecommend(input: AIInputDTO): Promise<RecoveryRecommendationOutput>;
}
