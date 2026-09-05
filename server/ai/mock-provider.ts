import type { AIProvider } from "./provider";
import type {
  AIInputDTO,
  RecoveryRecommendationOutput,
  RecoveryActionType,
  DiagnosisSeverity,
} from "./types";
import { recoveryRecommendationSchema } from "./schemas";

/**
 * Deterministic Mock AI Provider
 *
 * Simulates an LLM reasoning engine using multi-signal heuristics based on
 * failure codes, attempt history, transaction value, and customer tier.
 *
 * CRITICAL ARCHITECTURAL RULE:
 * This provider has ZERO access to EventGroundTruth. It reasons solely from
 * the operational features present in AIInputDTO.
 */
export class MockAIProvider implements AIProvider {
  public readonly name = "mock";
  public readonly model = "mock-reasoning-v1";

  async diagnoseAndRecommend(input: AIInputDTO): Promise<RecoveryRecommendationOutput> {
    const {
      eventId,
      amountAtRiskINR,
      category,
      paymentMethod,
      failureCode,
      failureReason,
      attemptNumber,
      recoveryAttemptsCount,
      customerTier,
      isSubscription,
      previousSuccessCount,
      isRecoveryEligible,
    } = input;

    let action: RecoveryActionType = "NONE";
    let reason = "";
    let confidence = 0.5;
    let expectedBenefit = "";
    let summary = "";
    let likelyCause = "";
    let severity: DiagnosisSeverity = "MEDIUM";

    let requiresCustomerAction = false;
    let requiresHumanReview = false;
    let shouldStopAutomation = false;

    // SIGNAL 1: Permanent / Non-actionable instrument blocks
    const permanentBlockCodes = [
      "CARD_BLOCKED_STOLEN",
      "ACCOUNT_CLOSED_FROZEN",
      "FRAUD_RISK_BLOCK",
    ];
    if (
      permanentBlockCodes.includes(failureCode) ||
      !isRecoveryEligible ||
      category === "NON_RECOVERABLE"
    ) {
      action = "NONE";
      severity = "CRITICAL";
      confidence = 0.96;
      shouldStopAutomation = true;
      requiresHumanReview = false;
      requiresCustomerAction = false;
      summary = `Permanent instrument failure detected (${failureCode}).`;
      likelyCause = `The issuing bank has permanently disabled the ${paymentMethod} instrument due to customer security alerts or closed account status.`;
      reason = `Instrument or beneficiary account is irrevocably disabled (${failureReason}). Further automated recovery attempts violate compliance guidelines.`;
      expectedBenefit =
        "Prevents dispute fees, gateway chargeback penalties, and futile retry overhead.";
    }
    // SIGNAL 2: Excessive attempts or repeated decline exhaustion
    else if (
      attemptNumber >= 3 ||
      recoveryAttemptsCount >= 2 ||
      category === "REPEATED_PAYMENT_FAILURE"
    ) {
      action = "ESCALATE_HUMAN";
      severity = amountAtRiskINR > 10000 ? "HIGH" : "MEDIUM";
      confidence = 0.86;
      requiresHumanReview = true;
      shouldStopAutomation = true;
      requiresCustomerAction = false;
      summary = `Consecutive decline threshold reached (Attempt #${attemptNumber}).`;
      likelyCause =
        "Customer checkout has repeatedly failed authorization; automated retries are saturated.";
      reason = `Transaction has failed ${attemptNumber} consecutive times across ${recoveryAttemptsCount} prior recovery interventions. Continuous automated retries risk triggering bank fraud throttles.`;
      expectedBenefit =
        "Enables merchant operations or support to offer manual VIP concierge assistance or alternative routing.";
    }
    // SIGNAL 3: Customer authentication drop-off (OTP, 3DS challenge, UPI collect)
    else if (
      ["OTP_EXPIRED", "3DS_CHALLENGE_ABANDONED", "UPI_COLLECT_UNAPPROVED"].includes(failureCode) ||
      category === "CUSTOMER_ACTION_REQUIRED"
    ) {
      if (customerTier === "VIP" && amountAtRiskINR >= 25000) {
        // High-value VIP gets personalized escalation
        action = "ESCALATE_HUMAN";
        severity = "HIGH";
        confidence = 0.84;
        requiresHumanReview = true;
        summary = `High-value VIP authentication drop-off (₹${amountAtRiskINR.toLocaleString("en-IN")}).`;
        likelyCause =
          "VIP customer initiated payment but did not complete the authentication step.";
        reason = `High-intent VIP checkout of ₹${amountAtRiskINR.toLocaleString("en-IN")} abandoned during 2FA. White-glove concierge outreach recommended over generic dunning.`;
        expectedBenefit =
          "Protects high-margin merchant revenue while maintaining high-touch VIP relationship.";
      } else {
        action = "DYNAMIC_PAYMENT_LINK";
        severity = "MEDIUM";
        confidence = 0.89;
        requiresCustomerAction = true;
        requiresHumanReview = false;
        summary = `Customer action timeout during ${paymentMethod} authentication.`;
        likelyCause = `Customer did not complete multi-factor authorization (${failureCode}: "${failureReason}").`;
        reason = `Failure was caused by an expired OTP or unapproved collect modal, not an instrument defect. Generating a 1-click Razorpay dynamic payment link eliminates checkout friction.`;
        expectedBenefit =
          "Allows customer to immediately resume payment without rebuilding their cart or re-entering items.";
      }
    }
    // SIGNAL 4: Insufficient funds (Account balance / Card limit)
    else if (category === "INSUFFICIENT_FUNDS" || failureCode === "BANK_INSUFFICIENT_BALANCE") {
      if (attemptNumber > 2) {
        action = "ESCALATE_HUMAN";
        severity = "HIGH";
        confidence = 0.74;
        requiresHumanReview = true;
        summary = "Persistent balance shortage across multiple attempts.";
        likelyCause = "Customer account balance remains inadequate despite previous notifications.";
        reason =
          "Multiple attempts have failed due to balance shortages. Escalating to prevent customer annoyance.";
        expectedBenefit =
          "Allows support to offer flexible financing, split payments, or order rescheduling.";
      } else {
        action = "CUSTOMER_DUNNING";
        severity = "MEDIUM";
        // Confidence is moderate because funds availability timing is unpredictable
        confidence = customerTier === "VIP" ? 0.82 : 0.75;
        requiresCustomerAction = true;
        requiresHumanReview = false;
        summary = `Decline due to temporary liquidity shortfall (${failureReason}).`;
        likelyCause = "Issuing bank reported balance or daily card spending limit shortfall.";
        reason = `Payment failed due to temporary balance insufficiency. An automated reminder notification gives the customer time to top up their account or switch methods.`;
        expectedBenefit =
          "Recovers transaction by catching customer during active banking hours without aggressive retries.";
      }
    }
    // SIGNAL 5: Temporary technical or gateway timeouts
    else if (
      category === "TEMPORARY_PAYMENT_FAILURE" ||
      ["GATEWAY_TIMEOUT", "NPCI_NETWORK_LATENCY", "ACQUIRER_SYSTEM_ERROR"].includes(failureCode)
    ) {
      if (attemptNumber === 1) {
        action = "SMART_RETRY";
        severity = "LOW";
        confidence = 0.93; // High confidence for 1st technical drop with positive customer track record
        requiresCustomerAction = false;
        requiresHumanReview = false;
        summary = `Transient network/gateway timeout on ${paymentMethod} switch.`;
        likelyCause = `Intermittent latency spike at acquiring or issuing bank interface (${failureCode}).`;
        reason = `Customer has a healthy payment track record (${previousSuccessCount} successful payments) and transaction failed due to transient gateway latency. Automated exponential backoff retry is the optimal zero-friction path.`;
        expectedBenefit =
          "Fully frictionless recovery with zero customer friction or cart rebuilding required.";
      } else {
        action = "SMART_RETRY";
        severity = "MEDIUM";
        confidence = 0.76;
        requiresCustomerAction = false;
        requiresHumanReview = false;
        summary = `Second technical timeout on ${paymentMethod} network switch.`;
        likelyCause = "Repeated network degradation between payment gateway and issuing switch.";
        reason =
          "Technical failure recurred on attempt 2. A final backoff retry window is warranted before escalating.";
        expectedBenefit = "Recovers payment if switch recovers without burdening customer.";
      }
    }
    // SIGNAL 6: Abandoned checkout drop-offs
    else if (category === "ABANDONED_CHECKOUT") {
      action = isSubscription ? "CUSTOMER_DUNNING" : "DYNAMIC_PAYMENT_LINK";
      severity = "LOW";
      confidence = 0.71;
      requiresCustomerAction = true;
      requiresHumanReview = false;
      summary = `Cart abandoned prior to payment gateway finalization.`;
      likelyCause = "Customer exited checkout flow after selecting payment details.";
      reason = isSubscription
        ? "Subscription registration incomplete. Sending a targeted notification highlighting plan benefits."
        : "Standard checkout abandonment. Delivering a direct dynamic payment link to re-engage buyer intent.";
      expectedBenefit = "Re-engages warm buyer intent before cart expiration window closes.";
    }
    // Default fallback
    else {
      action = isRecoveryEligible ? "SMART_RETRY" : "NONE";
      severity = "MEDIUM";
      confidence = 0.62;
      summary = `Payment failure analysis for ${category}.`;
      likelyCause = failureReason;
      reason = `Operational heuristic suggests ${action} based on recovery eligibility flag.`;
      expectedBenefit = "Standard automated recovery baseline.";
    }

    const output: RecoveryRecommendationOutput = {
      eventId,
      diagnosis: {
        summary,
        failureType: category,
        likelyCause,
        severity,
      },
      recommendation: {
        action,
        reason,
        confidence,
        expectedBenefit,
      },
      safety: {
        requiresCustomerAction,
        requiresHumanReview,
        shouldStopAutomation,
      },
      provider: this.name,
      model: this.model,
      generatedAt: new Date().toISOString(),
    };

    // Ensure output strictly conforms to the Zod schema
    return recoveryRecommendationSchema.parse(output);
  }
}
