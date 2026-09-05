import { NextResponse } from "next/server";
import { runEvaluationRequestSchema } from "@/server/evaluation/schemas";
import { runEvaluationEngine, getLatestEvaluationResult } from "@/server/evaluation/engine";

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            error: "Invalid JSON in request body",
            code: "INVALID_JSON",
          },
          { status: 400 }
        );
      }
    }

    const parseResult = runEvaluationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid evaluation parameters",
          code: "VALIDATION_ERROR",
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const evaluationResult = await runEvaluationEngine(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        evaluation: evaluationResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing evaluation benchmark engine:", error);
    return NextResponse.json(
      {
        error: "Internal server error during evaluation benchmark run",
        code: "EVALUATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    let latest = getLatestEvaluationResult();
    if (!latest) {
      // Run once on demand if no cached result exists
      latest = await runEvaluationEngine({ sampleSize: 1000 });
    }

    return NextResponse.json(
      {
        success: true,
        evaluation: latest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching latest evaluation benchmark:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve evaluation benchmark result",
        code: "FETCH_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
