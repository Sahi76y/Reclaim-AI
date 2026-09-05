import type { AIProvider } from "./provider";
import type { AIInputDTO, RecoveryRecommendationOutput } from "./types";
import { OpenAIAPIKeyMissingError, AIProviderError, MalformedAIOutputError } from "./provider";
import { recoveryRecommendationSchema } from "./schemas";
import { REVENUE_RECOVERY_SYSTEM_PROMPT, buildUserDiagnosisPrompt } from "./prompts";

/**
 * Production-ready OpenAI Provider for ReclaimAI
 *
 * Connects to OpenAI's Chat Completions API with structured JSON output enforcement.
 * Gracefully fails if OPENAI_API_KEY is not configured in the environment.
 */
export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";
  public readonly model: string;
  private readonly apiKey: string | undefined;

  constructor(model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
    this.model = model;
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async diagnoseAndRecommend(input: AIInputDTO): Promise<RecoveryRecommendationOutput> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new OpenAIAPIKeyMissingError();
    }

    const systemPrompt = REVENUE_RECOVERY_SYSTEM_PROMPT;
    const userPrompt = buildUserDiagnosisPrompt(input);

    let rawResponse: string;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown OpenAI API error");
        throw new AIProviderError(
          `OpenAI API request failed with HTTP status ${response.status}: ${errorText}`,
          this.name
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      rawResponse = data.choices?.[0]?.message?.content ?? "";
    } catch (err: unknown) {
      if (err instanceof AIProviderError) throw err;
      const error = err as Error;
      throw new AIProviderError(
        `Failed to communicate with OpenAI API: ${error.message}`,
        this.name,
        err
      );
    }

    if (!rawResponse) {
      throw new AIProviderError("OpenAI returned an empty completion response.", this.name);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawResponse);
    } catch (err) {
      throw new MalformedAIOutputError(this.name, { rawResponse, parseError: err });
    }

    // Ensure eventId is attached
    if (typeof parsedJson === "object" && parsedJson !== null) {
      (parsedJson as Record<string, unknown>).eventId = input.eventId;
      (parsedJson as Record<string, unknown>).provider = this.name;
      (parsedJson as Record<string, unknown>).model = this.model;
      if (!(parsedJson as Record<string, unknown>).generatedAt) {
        (parsedJson as Record<string, unknown>).generatedAt = new Date().toISOString();
      }
    }

    // Validate using Zod
    const validationResult = recoveryRecommendationSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      throw new MalformedAIOutputError(this.name, validationResult.error.format());
    }

    return validationResult.data;
  }
}
