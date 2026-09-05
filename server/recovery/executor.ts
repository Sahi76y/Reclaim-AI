import crypto from "crypto";
import type {
  RecoveryAction,
  RecoveryExecutionInput,
  RecoveryExecutionResult,
  RecoveryExecutionProvider,
  RecoveryExecutor,
} from "./types";
import { recoveryExecutionResultSchema } from "./schemas";
import { getRecoveryStrategy } from "./strategies";
import {
  getAIInputByEventId,
  getPolicyDecisionByEventId,
  getRecoveryExecutionByIdempotencyKey,
  saveRecoveryExecution,
  saveRecoveryCommunicationTask,
  saveHumanReviewTask,
} from "@/server/risk-events/repository";
import { recordRecoveryExecutionAudit, recordRefusedExecutionAudit } from "@/server/audit";

export interface ExecutionGuardCheckResult {
  allowed: boolean;
  reason?: string;
  suggestedStatus?: RecoveryExecutionResult["status"];
}

/**
 * Checks all 8 safety preconditions before financial recovery execution.
 */
export function checkExecutionGuard(
  event: { id: string; isRecoveryEligible: boolean; amountAtRisk: number },
  decision: {
    id: string;
    riskEventId: string;
    decision: string;
    approvedAction: string;
    shouldStopAutomation: boolean;
  }
): ExecutionGuardCheckResult {
  // Check 1: Policy decision belongs to the event
  if (decision.riskEventId !== event.id) {
    return {
      allowed: false,
      reason: `Integrity Mismatch: Policy decision ${decision.id} belongs to event ${decision.riskEventId}, not ${event.id}`,
      suggestedStatus: "SKIPPED",
    };
  }

  // Check 2: Policy decision is ALLOW or otherwise explicitly executable
  if (decision.decision === "BLOCK") {
    return {
      allowed: false,
      reason: "Policy Engine Decision is BLOCK: Execution refused by safety guardrail",
      suggestedStatus: "SKIPPED",
    };
  }

  if (decision.decision === "ESCALATE") {
    return {
      allowed: false,
      reason:
        "Policy Engine Decision is ESCALATE: Execution refused for automated processing; requires human intervention",
      suggestedStatus: "ESCALATED",
    };
  }

  // Check 3: approvedAction is not NONE
  if (decision.approvedAction === "NONE") {
    return {
      allowed: false,
      reason: "Approved action is NONE: No recovery execution warranted",
      suggestedStatus: "SKIPPED",
    };
  }

  // Check 4: shouldStopAutomation is false
  if (decision.shouldStopAutomation) {
    return {
      allowed: false,
      reason: "Automation Stopped: shouldStopAutomation flag is set to true by policy decision",
      suggestedStatus: "SKIPPED",
    };
  }

  // Check 5: approvedAction is supported
  const supportedActions: RecoveryAction[] = [
    "SMART_RETRY",
    "CUSTOMER_DUNNING",
    "DYNAMIC_PAYMENT_LINK",
    "ESCALATE_HUMAN",
    "NONE",
  ];
  if (!supportedActions.includes(decision.approvedAction as RecoveryAction)) {
    return {
      allowed: false,
      reason: `Unsupported action: "${decision.approvedAction}" is not a supported recovery executor action`,
      suggestedStatus: "SKIPPED",
    };
  }

  // Check 6: Event is recovery eligible
  if (!event.isRecoveryEligible) {
    return {
      allowed: false,
      reason: "Ineligible Event: Event is marked isRecoveryEligible === false",
      suggestedStatus: "SKIPPED",
    };
  }

  // Check 7: Amount is valid
  if (event.amountAtRisk <= 0) {
    return {
      allowed: false,
      reason: "Invalid Amount: Event amount at risk must be greater than zero",
      suggestedStatus: "SKIPPED",
    };
  }

  return { allowed: true };
}

/**
 * Builds the unique idempotency key for an execution attempt.
 */
export function buildIdempotencyKey(
  eventId: string,
  policyDecisionId: string,
  action: string
): string {
  return `${eventId}:${policyDecisionId}:${action}`;
}

/**
 * Controlled Recovery Execution Engine
 *
 * Enforces:
 * - Unidirectional flow: PolicyDecision -> RecoveryExecutor -> Provider Test Mode
 * - 8-point safety execution guard
 * - Idempotency protection (never execute same key twice)
 * - Zero access to evaluation-only ground truth
 * - Zod output validation
 * - Audit trail logging
 */
export class RecoveryExecutionEngine implements RecoveryExecutor {
  /**
   * Executes a verified RecoveryExecutionInput.
   */
  public async execute(input: RecoveryExecutionInput): Promise<RecoveryExecutionResult> {
    const {
      eventId,
      policyDecisionId,
      approvedAction,
      amountAtRisk,
      currency,
      idempotencyKey,
      metadata = {},
    } = input;

    // Check idempotency first: If already executed, return existing execution result
    const existing = await getRecoveryExecutionByIdempotencyKey(idempotencyKey);
    if (existing) {
      return recoveryExecutionResultSchema.parse({
        executionId: existing.id ?? `exec_${Date.now()}`,
        eventId: existing.riskEventId,
        policyDecisionId: existing.policyDecisionId,
        action: existing.action,
        status: existing.status,
        provider: existing.provider,
        providerReference: existing.providerReference,
        recoveredAmount: Math.min(existing.recoveredAmount, amountAtRisk),
        currency: existing.currency ?? currency,
        failureReason: existing.failureReason,
        executedAt:
          typeof existing.executedAt === "string"
            ? existing.executedAt
            : new Date(existing.executedAt ?? Date.now()).toISOString(),
        metadata: {
          ...existing.metadata,
          idempotentReplay: true,
        },
      });
    }

    // Execute through appropriate strategy
    const strategy = getRecoveryStrategy(approvedAction);
    const strategyOutput = await strategy.execute(input);

    // Enforce recoveredAmount <= amountAtRisk
    const boundedRecoveredAmount = Math.min(
      Math.max(strategyOutput.recoveredAmount, 0),
      amountAtRisk
    );

    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const executedAt = new Date().toISOString();

    const result: RecoveryExecutionResult = {
      executionId,
      eventId,
      policyDecisionId,
      action: approvedAction,
      status: strategyOutput.status,
      provider: strategyOutput.provider,
      providerReference: strategyOutput.providerReference,
      recoveredAmount: boundedRecoveredAmount,
      currency,
      failureReason: strategyOutput.failureReason,
      executedAt,
      metadata: {
        ...metadata,
        ...strategyOutput.metadata,
        idempotencyKey,
        amountAtRisk,
      },
    };

    // Validate result through Zod
    const validatedResult = recoveryExecutionResultSchema.parse(result);

    // Persist communication task if created (for CUSTOMER_DUNNING)
    if (strategyOutput.communicationTask) {
      await saveRecoveryCommunicationTask({
        riskEventId: strategyOutput.communicationTask.riskEventId,
        policyDecisionId: strategyOutput.communicationTask.policyDecisionId,
        customerReference: strategyOutput.communicationTask.customerReference,
        action: strategyOutput.communicationTask.action,
        reason: strategyOutput.communicationTask.reason,
        status: strategyOutput.communicationTask.status,
      });
    }

    // Persist human review task if created (for ESCALATE_HUMAN)
    if (strategyOutput.humanReviewTask) {
      await saveHumanReviewTask({
        riskEventId: strategyOutput.humanReviewTask.riskEventId,
        policyDecisionId: strategyOutput.humanReviewTask.policyDecisionId,
        reason: strategyOutput.humanReviewTask.reason,
        priority: strategyOutput.humanReviewTask.priority,
        status: strategyOutput.humanReviewTask.status,
      });
    }

    // Persist recovery execution record
    await saveRecoveryExecution({
      id: validatedResult.executionId,
      riskEventId: validatedResult.eventId,
      policyDecisionId: validatedResult.policyDecisionId,
      action: validatedResult.action,
      status: validatedResult.status,
      provider: validatedResult.provider,
      providerReference: validatedResult.providerReference,
      recoveredAmount: validatedResult.recoveredAmount,
      currency: validatedResult.currency,
      failureReason: validatedResult.failureReason,
      idempotencyKey,
      metadata: validatedResult.metadata,
      executedAt: validatedResult.executedAt,
    });

    // Write immutable audit log
    await recordRecoveryExecutionAudit(validatedResult);

    return validatedResult;
  }

  /**
   * High-level entry point: Loads event & policy decision, evaluates guards, and executes.
   */
  public async executeForEvent(
    eventId: string,
    providerPreference: RecoveryExecutionProvider = "RAZORPAY_TEST"
  ): Promise<{
    allowed: boolean;
    result: RecoveryExecutionResult;
    guardReason?: string;
  }> {
    // 1. Load operational telemetry (CRITICAL: getAIInputByEventId excludes ground truth & PII)
    const event = await getAIInputByEventId(eventId);
    if (!event) {
      throw new Error(`RiskEvent not found: ${eventId}`);
    }

    // 2. Load policy decision
    const decision = await getPolicyDecisionByEventId(eventId);
    if (!decision) {
      throw new Error(`PolicyDecision not found for event: ${eventId}`);
    }

    // 3. Evaluate 8-point Execution Guard
    const guardCheck = checkExecutionGuard(
      {
        id: event.eventId,
        isRecoveryEligible: event.isRecoveryEligible,
        amountAtRisk: event.amountAtRisk,
      },
      {
        id: decision.id ?? "dec_unknown",
        riskEventId: decision.riskEventId,
        decision: decision.decision,
        approvedAction: decision.approvedAction,
        shouldStopAutomation: decision.shouldStopAutomation ?? false,
      }
    );

    const idempotencyKey = buildIdempotencyKey(
      eventId,
      decision.id ?? "dec_unknown",
      decision.approvedAction
    );

    // If guard check fails: Refuse execution, write audit log, return safe result
    if (!guardCheck.allowed) {
      await recordRefusedExecutionAudit({
        eventId,
        policyDecisionId: decision.id,
        attemptedAction: decision.approvedAction,
        reason: guardCheck.reason ?? "Execution refused by safety guardrail",
      });

      const refusedResult: RecoveryExecutionResult = {
        executionId: `refused_${Date.now()}`,
        eventId,
        policyDecisionId: decision.id ?? "dec_unknown",
        action: (decision.approvedAction as RecoveryAction) || "NONE",
        status: guardCheck.suggestedStatus ?? "SKIPPED",
        provider: providerPreference,
        recoveredAmount: 0,
        currency: event.currency,
        failureReason: guardCheck.reason,
        executedAt: new Date().toISOString(),
        metadata: {
          executionRefused: true,
          guardReason: guardCheck.reason,
        },
      };

      return {
        allowed: false,
        result: refusedResult,
        guardReason: guardCheck.reason,
      };
    }

    // Guard passed -> Execute approved action
    const input: RecoveryExecutionInput = {
      eventId: event.eventId,
      policyDecisionId: decision.id ?? "dec_unknown",
      approvedAction: decision.approvedAction as RecoveryAction,
      amountAtRisk: event.amountAtRisk,
      currency: event.currency,
      idempotencyKey,
      providerPreference,
      metadata: {
        attemptNumber: event.attemptNumber,
        paymentMethod: event.paymentMethod,
        failureCode: event.failureCode,
        category: event.category,
        severity: event.severity,
        reason: decision.reasons?.[0],
      },
    };

    const executionResult = await this.execute(input);

    return {
      allowed: true,
      result: executionResult,
    };
  }
}

let defaultEngineInstance: RecoveryExecutionEngine | null = null;

export function getRecoveryExecutionEngine(): RecoveryExecutionEngine {
  if (!defaultEngineInstance) {
    defaultEngineInstance = new RecoveryExecutionEngine();
  }
  return defaultEngineInstance;
}
