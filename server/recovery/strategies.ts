import type {
  RecoveryAction,
  RecoveryExecutionInput,
  RecoveryExecutionResult,
  RecoveryCommunicationTaskDTO,
  HumanReviewTaskDTO,
} from "./types";
import { getRazorpayProvider } from "@/server/razorpay";
import { simulateRecoveryExecution } from "./simulator";

export interface StrategyExecutionOutput {
  status: RecoveryExecutionResult["status"];
  provider: RecoveryExecutionResult["provider"];
  providerReference?: string;
  recoveredAmount: number;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  communicationTask?: Omit<RecoveryCommunicationTaskDTO, "id" | "createdAt">;
  humanReviewTask?: Omit<HumanReviewTaskDTO, "id" | "createdAt">;
}

export interface ActionStrategy {
  execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput>;
}

/**
 * SMART_RETRY Strategy: Controlled test-mode retry execution
 */
export class SmartRetryStrategy implements ActionStrategy {
  public async execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput> {
    const providerType = input.providerPreference ?? "RAZORPAY_TEST";

    if (providerType === "SIMULATOR") {
      const simResult = simulateRecoveryExecution({
        eventId: input.eventId,
        action: input.approvedAction,
        amountAtRisk: input.amountAtRisk,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        attemptNumber: (input.metadata?.attemptNumber as number) ?? 1,
        paymentMethod: (input.metadata?.paymentMethod as string) ?? "UPI",
        failureCode: (input.metadata?.failureCode as string) ?? "",
      });

      return {
        status: simResult.status,
        provider: "SIMULATOR",
        providerReference: simResult.providerReference,
        recoveredAmount: Math.min(simResult.recoveredAmount, input.amountAtRisk),
        failureReason: simResult.failureReason,
        metadata: {
          simulationEngine: "deterministic-v1",
          mode: "SIMULATED",
        },
      };
    }

    // Razorpay Test Mode execution
    const rzp = getRazorpayProvider("RAZORPAY_TEST");
    const retryResult = await rzp.retryPayment({
      amount: input.amountAtRisk,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    });

    return {
      status: retryResult.status,
      provider: "RAZORPAY_TEST",
      providerReference: retryResult.providerReference,
      recoveredAmount: retryResult.success
        ? Math.min(retryResult.recoveredAmount, input.amountAtRisk)
        : 0,
      failureReason: retryResult.failureReason,
      metadata: {
        mode: "RAZORPAY_TEST_MODE",
        gatewayTimestamp: retryResult.gatewayTimestamp,
      },
    };
  }
}

/**
 * DYNAMIC_PAYMENT_LINK Strategy: Creates test-mode dynamic payment link
 * Does NOT send link to customers.
 */
export class DynamicPaymentLinkStrategy implements ActionStrategy {
  public async execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput> {
    const providerType = input.providerPreference ?? "RAZORPAY_TEST";

    if (providerType === "SIMULATOR") {
      const simResult = simulateRecoveryExecution({
        eventId: input.eventId,
        action: input.approvedAction,
        amountAtRisk: input.amountAtRisk,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
      });

      return {
        status: "PENDING",
        provider: "SIMULATOR",
        providerReference: simResult.providerReference,
        recoveredAmount: 0,
        metadata: {
          mode: "SIMULATED",
          paymentLinkUrl: `https://rzp.io/i/${simResult.providerReference}`,
          expiryMinutes: 2880,
          customerNotificationSent: false,
        },
      };
    }

    const rzp = getRazorpayProvider("RAZORPAY_TEST");
    const linkResult = await rzp.createPaymentLink({
      amount: input.amountAtRisk,
      currency: "INR",
      description: `Recovery Payment Link for Event ${input.eventId}`,
      idempotencyKey: input.idempotencyKey,
      expiryMinutes: 2880, // 48 hours bounded
      notes: {
        eventId: input.eventId,
        policyDecisionId: input.policyDecisionId,
        testMode: "true",
      },
    });

    if (!linkResult.success) {
      return {
        status: "FAILED",
        provider: "RAZORPAY_TEST",
        providerReference: linkResult.providerReference,
        recoveredAmount: 0,
        failureReason: linkResult.failureReason ?? "Failed to create payment link in test mode",
      };
    }

    return {
      status: "PENDING",
      provider: "RAZORPAY_TEST",
      providerReference: linkResult.providerReference,
      recoveredAmount: 0,
      metadata: {
        mode: "RAZORPAY_TEST_MODE",
        paymentLinkUrl: linkResult.paymentLinkUrl,
        expiryAt: linkResult.expiryAt,
        customerNotificationSent: false,
      },
    };
  }
}

/**
 * CUSTOMER_DUNNING Strategy: Creates RecoveryCommunicationTask (PENDING)
 * Does NOT send actual emails, SMS, or WhatsApp.
 */
export class CustomerDunningStrategy implements ActionStrategy {
  public async execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput> {
    const customerRef = (input.metadata?.customerId as string) || `cust_anon_${input.eventId}`;

    return {
      status: "PENDING",
      provider: input.providerPreference ?? "RAZORPAY_TEST",
      providerReference: `task_dunning_${input.eventId.replace("evt_", "")}`,
      recoveredAmount: 0,
      metadata: {
        actionType: "CUSTOMER_DUNNING",
        taskCreated: true,
        actualMessageDispatched: false,
      },
      communicationTask: {
        riskEventId: input.eventId,
        policyDecisionId: input.policyDecisionId,
        customerReference: customerRef,
        action: "CUSTOMER_DUNNING",
        reason: "Automated dunning communication task queued for payment recovery",
        status: "PENDING",
      },
    };
  }
}

/**
 * ESCALATE_HUMAN Strategy: Operational handoff to HumanReviewTask
 */
export class EscalateHumanStrategy implements ActionStrategy {
  public async execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput> {
    return {
      status: "ESCALATED",
      provider: input.providerPreference ?? "SIMULATOR",
      providerReference: `task_rev_${input.eventId.replace("evt_", "")}`,
      recoveredAmount: 0,
      failureReason: "Transferred to human operations queue for manual review",
      metadata: {
        actionType: "ESCALATE_HUMAN",
        humanReviewTaskCreated: true,
      },
      humanReviewTask: {
        riskEventId: input.eventId,
        policyDecisionId: input.policyDecisionId,
        reason:
          (input.metadata?.reason as string) || "Policy guardrail routed event to human review",
        priority: (input.metadata?.severity as "LOW" | "MEDIUM" | "HIGH" | "URGENT") || "MEDIUM",
        status: "OPEN",
      },
    };
  }
}

/**
 * NONE Strategy: No execution
 */
export class NoneStrategy implements ActionStrategy {
  public async execute(input: RecoveryExecutionInput): Promise<StrategyExecutionOutput> {
    return {
      status: "SKIPPED",
      provider: input.providerPreference ?? "SIMULATOR",
      providerReference: undefined,
      recoveredAmount: 0,
      failureReason: "Approved action is NONE: no financial recovery attempted",
      metadata: {
        actionType: "NONE",
        executionSkipped: true,
      },
    };
  }
}

export function getRecoveryStrategy(action: RecoveryAction): ActionStrategy {
  switch (action) {
    case "SMART_RETRY":
      return new SmartRetryStrategy();
    case "DYNAMIC_PAYMENT_LINK":
      return new DynamicPaymentLinkStrategy();
    case "CUSTOMER_DUNNING":
      return new CustomerDunningStrategy();
    case "ESCALATE_HUMAN":
      return new EscalateHumanStrategy();
    case "NONE":
    default:
      return new NoneStrategy();
  }
}
