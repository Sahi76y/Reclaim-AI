import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAIInputByEventId,
  getRecoveryRecommendationByEventId,
  savePolicyDecision,
} from "@/server/risk-events/repository";
import { evaluatePolicy } from "@/server/policy";
import { policyEvaluateRequestSchema } from "@/server/policy/schemas";
import { recordPolicyDecisionAudit } from "@/server/audit";
import type { RecoveryActionType, DiagnosisSeverity } from "@/server/ai/types";

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

    const parseResult = policyEvaluateRequestSchema.safeParse(body);
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

    const { eventId, config } = parseResult.data;

    // 1. Load RiskEvent (projecting only AI/policy-safe fields; ground-truth isolated)
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

    // 2. Load existing RecoveryRecommendation
    const recommendationRecord = await getRecoveryRecommendationByEventId(eventId);
    if (!recommendationRecord) {
      return NextResponse.json(
        {
          error: `Recovery recommendation for event '${eventId}' does not exist. An AI diagnosis must be generated first.`,
          code: "RECOMMENDATION_NOT_FOUND",
          eventId,
        },
        { status: 404 }
      );
    }

    // 3. Format recommendation object for policy evaluator
    const recommendationOutput = {
      eventId: recommendationRecord.riskEventId,
      diagnosis: {
        summary: recommendationRecord.diagnosisSummary,
        failureType: event.category,
        likelyCause: recommendationRecord.likelyCause,
        severity: recommendationRecord.severity as DiagnosisSeverity,
      },
      recommendation: {
        action: recommendationRecord.action as RecoveryActionType,
        reason: recommendationRecord.reasoning,
        confidence: recommendationRecord.confidenceScore,
        expectedBenefit: recommendationRecord.expectedBenefit,
      },
      safety: recommendationRecord.safetyFlags,
      provider: recommendationRecord.provider ?? "mock",
      model: recommendationRecord.model ?? "mock-reasoning-v1",
      generatedAt: new Date(recommendationRecord.createdAt ?? Date.now()).toISOString(),
    };

    // 4. Run deterministic PolicyEngine
    const decision = evaluatePolicy(
      {
        event,
        recommendation: recommendationOutput,
      },
      config
    );

    // 5. Persist PolicyDecision with idempotency protection
    await savePolicyDecision({
      riskEventId: decision.eventId,
      recommendationId: decision.recommendationId,
      decision: decision.decision,
      originalAction: decision.originalAction,
      approvedAction: decision.approvedAction,
      reasons: decision.reasons,
      ruleResults: decision.ruleResults,
      policyVersion: decision.policyVersion,
      requiresHumanReview: decision.requiresHumanReview,
      requiresCustomerAction: decision.requiresCustomerAction,
      shouldStopAutomation: decision.shouldStopAutomation,
      evaluatedAt: new Date(decision.evaluatedAt),
    });

    // 6. Record Audit Log entry
    await recordPolicyDecisionAudit(decision);

    // 7. Structured log output
    console.log(
      `[POLICY_GUARDRAIL_AUDIT] Event: ${decision.eventId} | Decision: ${decision.decision} | Original: ${decision.originalAction} -> Approved: ${decision.approvedAction} | RequiresHumanReview: ${decision.requiresHumanReview}`
    );

    return NextResponse.json({
      success: true,
      data: decision,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Policy decision failed schema validation",
          code: "SCHEMA_VALIDATION_ERROR",
          issues: error.flatten(),
        },
        { status: 502 }
      );
    }

    console.error("[API_POLICY_EVALUATE_ERROR]", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during policy guardrail evaluation",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
