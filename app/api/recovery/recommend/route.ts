import { NextResponse } from "next/server";
import { z } from "zod";
import {
  diagnoseAndRecommendEvent,
  RiskEventNotFoundError,
  AIProviderError,
  OpenAIAPIKeyMissingError,
  MalformedAIOutputError,
} from "@/server/ai";

const requestBodySchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  provider: z.enum(["mock", "openai"]).optional(),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const parseResult = requestBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          code: "VALIDATION_ERROR",
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { eventId, provider } = parseResult.data;

    const recommendation = await diagnoseAndRecommendEvent(eventId, {
      provider,
    });

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    if (error instanceof RiskEventNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "EVENT_NOT_FOUND",
          eventId: error.eventId,
        },
        { status: 404 }
      );
    }

    if (error instanceof OpenAIAPIKeyMissingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "OPENAI_KEY_MISSING",
        },
        { status: 500 }
      );
    }

    if (error instanceof MalformedAIOutputError) {
      return NextResponse.json(
        {
          error: "AI Provider returned malformed structured output",
          code: "MALFORMED_AI_OUTPUT",
          details: error.rawOutput,
        },
        { status: 502 }
      );
    }

    if (error instanceof AIProviderError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "AI_PROVIDER_ERROR",
          provider: error.provider,
        },
        { status: 502 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "AI recommendation failed schema validation",
          code: "SCHEMA_VALIDATION_ERROR",
          issues: error.flatten(),
        },
        { status: 502 }
      );
    }

    console.error("[API_RECOMMEND_ERROR]", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during AI diagnosis",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
