import { NextResponse } from "next/server";
import { recoveryOutcomeWebhookSchema } from "@/server/recovery/schemas";
import {
  getRecoveryExecutionById,
  updateRecoveryExecutionOutcome,
  getAIInputByEventId,
} from "@/server/risk-events/repository";

/**
 * DEVELOPMENT & TEST MODE ONLY OUTCOME SIMULATION WEBHOOK
 *
 * Simulates an asynchronous callback from a payment provider (Razorpay Test Mode or Simulator).
 * NOT A PRODUCTION WEBHOOK.
 */
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

    const parseResult = recoveryOutcomeWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          code: "VALIDATION_ERROR",
          issues: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { executionId, status, recoveredAmount, providerReference, failureReason } =
      parseResult.data;

    // 1. Verify execution exists
    const execution = await getRecoveryExecutionById(executionId);
    if (!execution) {
      return NextResponse.json(
        {
          error: `RecoveryExecution with ID '${executionId}' was not found.`,
          code: "EXECUTION_NOT_FOUND",
          executionId,
        },
        { status: 404 }
      );
    }

    // 2. Validate provider is test/simulator
    if (execution.provider !== "SIMULATOR" && execution.provider !== "RAZORPAY_TEST") {
      return NextResponse.json(
        {
          error: "Webhook simulation only allowed for SIMULATOR and RAZORPAY_TEST providers.",
          code: "INVALID_PROVIDER",
        },
        { status: 400 }
      );
    }

    // 3. Prevent overwriting already finalized executions incorrectly
    if (execution.status === "SUCCESS" || execution.status === "FAILED") {
      return NextResponse.json(
        {
          error: `Execution '${executionId}' is already finalized with status '${execution.status}'. Cannot overwrite.`,
          code: "EXECUTION_ALREADY_FINALIZED",
          currentStatus: execution.status,
        },
        { status: 400 }
      );
    }

    // 4. Validate recoveredAmount <= amountAtRisk
    let amountAtRisk = Number(execution.metadata?.amountAtRisk ?? 0);
    if (amountAtRisk <= 0) {
      const event = await getAIInputByEventId(execution.riskEventId);
      if (event) {
        amountAtRisk = event.amountAtRisk;
      }
    }

    if (status === "SUCCESS") {
      const amount = recoveredAmount ?? 0;
      if (amount <= 0) {
        return NextResponse.json(
          {
            error: "Successful recovery must include a positive recoveredAmount.",
            code: "INVALID_RECOVERED_AMOUNT",
          },
          { status: 400 }
        );
      }
      if (amountAtRisk > 0 && amount > amountAtRisk) {
        return NextResponse.json(
          {
            error: `Recovered amount (₹${amount / 100}) cannot exceed amount at risk (₹${amountAtRisk / 100}).`,
            code: "RECOVERED_AMOUNT_EXCEEDS_RISK",
            amountAtRisk,
            recoveredAmount: amount,
          },
          { status: 400 }
        );
      }
    }

    // 5. Update execution outcome
    const updated = await updateRecoveryExecutionOutcome(executionId, {
      status,
      recoveredAmount: status === "SUCCESS" ? recoveredAmount : 0,
      providerReference,
      failureReason,
    });

    return NextResponse.json(
      {
        success: true,
        mode: "DEV_TEST_WEBHOOK",
        execution: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing recovery outcome webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error during outcome simulation",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
