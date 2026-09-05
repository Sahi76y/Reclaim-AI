/**
 * Recovery Execution Engine Module
 *
 * SCOPE & ARCHITECTURAL INVARIANTS:
 * 1. AI Recommendation -> Policy Engine -> Approved Action -> Recovery Executor -> Razorpay Test Mode.
 * 2. Unidirectional financial safety: The Recovery Executor receives ONLY approvedAction from PolicyDecision.
 * 3. Strict test mode only (RAZORPAY_MODE=test).
 * 4. Ground-truth isolation: Recovery code and metrics NEVER access EventGroundTruth.
 * 5. Idempotent execution: eventId + policyDecisionId + approvedAction executed at most once.
 */

export * from "./types";
export * from "./schemas";
export * from "./simulator";
export * from "./strategies";
export * from "./executor";

import { getRecoveryExecutionEngine } from "./executor";
import type { RecoveryExecutionResult, RecoveryExecutionProvider } from "./types";

/**
 * Executes recovery for an event that has an approved PolicyDecision.
 */
export async function executeRecoveryForEvent(
  eventId: string,
  providerPreference: RecoveryExecutionProvider = "RAZORPAY_TEST"
): Promise<{
  allowed: boolean;
  result: RecoveryExecutionResult;
  guardReason?: string;
}> {
  const engine = getRecoveryExecutionEngine();
  return engine.executeForEvent(eventId, providerPreference);
}
