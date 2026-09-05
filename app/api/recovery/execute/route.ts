import { NextResponse } from "next/server";
import { executeRequestSchema } from "@/server/recovery/schemas";
import { getRecoveryExecutionEngine } from "@/server/recovery/executor";
import { getAIInputByEventId, getPolicyDecisionByEventId } from "@/server/risk-events/repository";

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

    const parseResult = executeRequestSchema.safeParse(body);
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

    const { eventId, providerPreference = "RAZORPAY_TEST" } = parseResult.data;

    // 1. Verify event exists
    const event = await getAIInputByEventId(eventId);
    if (!event) {
      return NextResponse.json(
        {
          error: `RiskEvent with ID '${eventId}' was not found.`,
          code: "EVENT_NOT_FOUND",
          eventId,
        },
        { status: 404 }
      );
    }

    // 2. Verify policy decision exists
    const decision = await getPolicyDecisionByEventId(eventId);
    if (!decision) {
      return NextResponse.json(
        {
          error: `Policy decision for event '${eventId}' was not found. A policy check must be evaluated before execution.`,
          code: "POLICY_DECISION_NOT_FOUND",
          eventId,
        },
        { status: 404 }
      );
    }

    // 3. Execute recovery through RecoveryExecutionEngine
    const engine = getRecoveryExecutionEngine();
    const outcome = await engine.executeForEvent(eventId, providerPreference);

    if (!outcome.allowed) {
      return NextResponse.json(
        {
          success: false,
          executionBlocked: true,
          guardReason: outcome.guardReason,
          result: outcome.result,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        executionBlocked: false,
        result: outcome.result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing recovery action:", error);
    return NextResponse.json(
      {
        error: "Internal server error during recovery execution",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
