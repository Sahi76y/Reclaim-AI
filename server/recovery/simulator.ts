import crypto from "crypto";
import type { RecoveryAction, RecoveryExecutionStatus } from "./types";

/**
 * Deterministic Recovery Execution Simulator
 *
 * ARCHITECTURAL SAFETY RULE:
 * - This simulator calculates outcome strictly from execution inputs and operational telemetry.
 * - It NEVER accesses or imports evaluation dataset labels.
 * - Output is 100% deterministic (reproducible for tests and evaluation).
 * - recoveredAmount can NEVER exceed amountAtRisk.
 */

export interface SimulatorInput {
  eventId: string;
  action: RecoveryAction;
  amountAtRisk: number; // minor units (paise)
  currency: string;
  attemptNumber?: number;
  paymentMethod?: string;
  failureCode?: string;
  idempotencyKey?: string;
}

export interface SimulatorResult {
  status: RecoveryExecutionStatus;
  recoveredAmount: number; // in paise, strictly <= amountAtRisk
  providerReference: string;
  failureReason?: string;
  simulatedAt: string;
}

/**
 * Derives a deterministic integer between 0 and 99 from a string input.
 */
function deterministicScore(seed: string): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const sub = hash.substring(0, 8);
  const intVal = parseInt(sub, 16);
  return intVal % 100;
}

/**
 * Simulates recovery execution deterministically without ground truth.
 */
export function simulateRecoveryExecution(input: SimulatorInput): SimulatorResult {
  const {
    eventId,
    action,
    amountAtRisk,
    attemptNumber = 1,
    paymentMethod = "UPI",
    failureCode = "",
  } = input;

  const now = new Date().toISOString();
  const seed = `${eventId}:${action}:${attemptNumber}:${paymentMethod}:${failureCode}`;
  const score = deterministicScore(seed);
  const refHash = crypto.createHash("sha256").update(seed).digest("hex").substring(0, 12);

  switch (action) {
    case "SMART_RETRY": {
      // Temporary network or gateway timeout failures recover with high likelihood on low attempts
      const isGatewayGlitch =
        failureCode.includes("TIMEOUT") ||
        failureCode.includes("GATEWAY") ||
        failureCode.includes("NETWORK");

      const isSevere =
        failureCode.includes("STOLEN") ||
        failureCode.includes("FRAUD") ||
        failureCode.includes("BLOCKED");

      let success = false;
      if (isSevere) {
        success = false;
      } else if (isGatewayGlitch) {
        // High recovery probability for gateway glitches if attempt <= 2
        success = attemptNumber <= 2 ? score < 85 : score < 30;
      } else {
        // Standard distribution based on attempt count
        success = attemptNumber === 1 ? score < 70 : score < 40;
      }

      if (success) {
        return {
          status: "SUCCESS",
          recoveredAmount: amountAtRisk, // Full recovery
          providerReference: `sim_pay_${refHash}`,
          simulatedAt: now,
        };
      }

      return {
        status: "FAILED",
        recoveredAmount: 0,
        providerReference: `sim_pay_${refHash}`,
        failureReason: "Simulated retry failed: issuer declined transaction",
        simulatedAt: now,
      };
    }

    case "DYNAMIC_PAYMENT_LINK": {
      // Creation of a payment link is immediately successful as a test reference,
      // but financial recovery remains PENDING until customer pays via link
      return {
        status: "PENDING",
        recoveredAmount: 0,
        providerReference: `sim_plink_${refHash}`,
        simulatedAt: now,
      };
    }

    case "CUSTOMER_DUNNING": {
      // Dunning notification queued; awaits customer payment response
      return {
        status: "PENDING",
        recoveredAmount: 0,
        providerReference: `sim_dunning_${refHash}`,
        simulatedAt: now,
      };
    }

    case "ESCALATE_HUMAN": {
      return {
        status: "ESCALATED",
        recoveredAmount: 0,
        providerReference: `sim_esc_${refHash}`,
        failureReason: "Execution routed to manual human escalation queue",
        simulatedAt: now,
      };
    }

    case "NONE":
    default: {
      return {
        status: "SKIPPED",
        recoveredAmount: 0,
        providerReference: `sim_none_${refHash}`,
        failureReason: "Action is NONE: execution skipped",
        simulatedAt: now,
      };
    }
  }
}
