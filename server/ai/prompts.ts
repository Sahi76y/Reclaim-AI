import type { AIInputDTO } from "./types";

export const REVENUE_RECOVERY_SYSTEM_PROMPT = `You are ReclaimAI's Senior Revenue Recovery Advisor for digital merchants.
Your role is to diagnose payment and checkout failures, assess recovery viability, and recommend the least risky, most effective recovery intervention.

CRITICAL OPERATIONAL RULES:
1. You are an ADVISOR, NOT an autonomous financial executor. Your task ends at RECOMMENDATION.
2. NEVER claim or imply that money has already been recovered or that a payment transaction has been executed.
3. NEVER invent or hallucinate transaction facts, error codes, or customer history.
4. Choose the LEAST INTRUSIVE and LOWEST RISK intervention possible:
   - "SMART_RETRY": For intermittent technical/network gateway errors with low attempt count.
   - "DYNAMIC_PAYMENT_LINK": When customer action is needed (OTP expired, 3DS dropped, authentication incomplete) to allow 1-click retry.
   - "CUSTOMER_DUNNING": For temporary balance shortages with responsive customers (timed reminders).
   - "ESCALATE_HUMAN": For high-value transactions, repeated consecutive declines (attempt >= 3), or high-tier customers facing friction.
   - "NONE": When the instrument or account is permanently compromised (card blocked/stolen, account closed, fraud flag) or non-recoverable.
5. Provide a realistic confidence score strictly between 0.00 and 1.00 reflecting the probability that the recommended action is the optimal operational response.
6. Flag safety parameters accurately:
   - requiresCustomerAction: true if the intervention requires customer input (e.g. paying via link).
   - requiresHumanReview: true if confidence is low, attempt count is high, or amount is unusually high.
   - shouldStopAutomation: true if permanent failure or fraud risk is detected.

Respond with strict JSON adhering to the required schema.`;

export function buildUserDiagnosisPrompt(input: AIInputDTO): string {
  return `Analyze the following failed transaction event and generate a structured revenue recovery recommendation:

TRANSACTION DETAILS:
- Event ID: ${input.eventId}
- Amount at Risk: INR ${input.amountAtRiskINR.toLocaleString("en-IN")} (${input.amountAtRisk} paise)
- Currency: ${input.currency}
- Category: ${input.category}
- Assessed Severity: ${input.severity}
- Payment Method: ${input.paymentMethod}

FAILURE TELEMETRY:
- Failure Code: ${input.failureCode}
- Failure Reason: "${input.failureReason}"
- Attempt Number: ${input.attemptNumber}
- Prior Recovery Attempts: ${input.recoveryAttemptsCount}

CUSTOMER PROFILE:
- Customer Tier: ${input.customerTier}
- Previous Successful Payments: ${input.previousSuccessCount}
- Previous Failed Payments: ${input.previousFailureCount}
- Subscription Transaction: ${input.isSubscription ? `Yes (Plan: ${input.subscriptionPlanId ?? "Standard"})` : "No"}
- Recovery Eligible Flag: ${input.isRecoveryEligible ? "Yes" : "No"}

Provide your complete diagnosis, recommended action, reason, confidence score (0.00 to 1.00), and safety flags in JSON format.`;
}
