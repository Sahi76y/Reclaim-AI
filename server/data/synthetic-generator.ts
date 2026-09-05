/**
 * Deterministic Synthetic Revenue-Risk Dataset Generator for ReclaimAI
 *
 * Implements a seeded pseudo-random number generator (Mulberry32) to generate
 * realistic, reproducible merchant payment failure events.
 *
 * ARCHITECTURAL RULE:
 * Input features and ground-truth evaluation labels are generated as paired,
 * strictly separated objects. Ground-truth fields must NEVER be fed into the AI
 * diagnosis engine.
 */

export type RiskCategoryType =
  | "TEMPORARY_PAYMENT_FAILURE"
  | "INSUFFICIENT_FUNDS"
  | "CUSTOMER_ACTION_REQUIRED"
  | "REPEATED_PAYMENT_FAILURE"
  | "ABANDONED_CHECKOUT"
  | "NON_RECOVERABLE";

export type RiskSeverityType = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PaymentMethodType = "UPI" | "CARD" | "NETBANKING" | "WALLET" | "EMI";
export type CustomerTierType = "VIP" | "REGULAR" | "NEW" | "CHURN_RISK";

export interface SyntheticRiskEventInput {
  id: string;
  merchantId: string;
  category: RiskCategoryType;
  severity: RiskSeverityType;
  amountAtRisk: number; // in minor units (paise)
  currency: string;
  customerId: string;
  customerEmail: string;
  orderId: string;
  paymentMethod: PaymentMethodType;
  failureCode: string;
  failureReason: string;
  attemptNumber: number;
  recoveryAttemptsCount: number;
  customerTier: CustomerTierType;
  isSubscription: boolean;
  subscriptionPlanId?: string;
  isRecoveryEligible: boolean;
  previousSuccessCount: number;
  previousFailureCount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SyntheticGroundTruth {
  riskEventId: string;
  isRecoverable: boolean;
  recoverableAmount: number; // in paise
  expectedRecoveryAction: string; // e.g. SMART_RETRY, DYNAMIC_PAYMENT_LINK, CUSTOMER_DUNNING, ESCALATE_HUMAN, NONE
  simulatedOutcome: string; // RECOVERED_FULL, RECOVERED_PARTIAL, EXPIRED_UNRECOVERED, PERMANENT_FAILURE
  simulatedRecoveryLatencyHours: number;
  evaluationNotes: string;
}

export interface PairedSyntheticRecord {
  event: SyntheticRiskEventInput;
  groundTruth: SyntheticGroundTruth;
}

/**
 * Seeded PRNG: Mulberry32
 * Generates high-quality 32-bit pseudo-random numbers with 100% determinism.
 */
export function createSeededRandom(seed: number) {
  let s = Math.floor(seed);
  return function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAILURE_CATALOG: Record<
  RiskCategoryType,
  Array<{ code: string; reason: string; severity: RiskSeverityType }>
> = {
  TEMPORARY_PAYMENT_FAILURE: [
    {
      code: "GATEWAY_TIMEOUT",
      reason: "Payment gateway timed out waiting for issuing bank authorization switch",
      severity: "MEDIUM",
    },
    {
      code: "NPCI_NETWORK_LATENCY",
      reason: "Intermittent network congestion reported on NPCI UPI switch",
      severity: "LOW",
    },
    {
      code: "ACQUIRER_SYSTEM_ERROR",
      reason: "Acquiring bank processing node temporarily unavailable",
      severity: "HIGH",
    },
  ],
  INSUFFICIENT_FUNDS: [
    {
      code: "BANK_INSUFFICIENT_BALANCE",
      reason: "Issuing bank declined transaction: Insufficient available account balance",
      severity: "HIGH",
    },
    {
      code: "CARD_LIMIT_EXCEEDED",
      reason: "Card network reported credit/debit transaction limit exceeded for customer",
      severity: "MEDIUM",
    },
  ],
  CUSTOMER_ACTION_REQUIRED: [
    {
      code: "OTP_EXPIRED",
      reason: "Two-factor authentication SMS OTP expired without customer submission",
      severity: "LOW",
    },
    {
      code: "3DS_CHALLENGE_ABANDONED",
      reason: "Customer closed 3D Secure browser challenge modal before verification",
      severity: "MEDIUM",
    },
    {
      code: "UPI_COLLECT_UNAPPROVED",
      reason: "UPI collect notification timed out after 10 minutes without MPIN approval",
      severity: "LOW",
    },
  ],
  REPEATED_PAYMENT_FAILURE: [
    {
      code: "CONSECUTIVE_DECLINE_LIMIT",
      reason: "Transaction declined consecutively across 3 retry attempts in 24 hours",
      severity: "CRITICAL",
    },
    {
      code: "GATEWAY_RECURRING_AUTH_REJECT",
      reason: "Repeated failure during automated standing instruction execution",
      severity: "HIGH",
    },
  ],
  ABANDONED_CHECKOUT: [
    {
      code: "CHECKOUT_DROPOFF_PAYMENT_STEP",
      reason: "Customer reached checkout payment gateway selection screen but exited session",
      severity: "MEDIUM",
    },
    {
      code: "CART_EXPIRATION",
      reason: "High-intent cart reservation expired without payment initiation",
      severity: "LOW",
    },
  ],
  NON_RECOVERABLE: [
    {
      code: "CARD_BLOCKED_STOLEN",
      reason: "Card issuer permanently blocked instrument due to lost/stolen alert",
      severity: "CRITICAL",
    },
    {
      code: "ACCOUNT_CLOSED_FROZEN",
      reason: "Beneficiary/Issuing bank account marked frozen or inactive",
      severity: "CRITICAL",
    },
    {
      code: "FRAUD_RISK_BLOCK",
      reason: "Transaction flagged and rejected by issuer risk rules",
      severity: "CRITICAL",
    },
  ],
};

export const PAYMENT_METHODS: PaymentMethodType[] = ["UPI", "CARD", "NETBANKING", "WALLET", "EMI"];
export const CUSTOMER_TIERS: CustomerTierType[] = ["VIP", "REGULAR", "NEW", "CHURN_RISK"];

/**
 * Generates a deterministic list of paired synthetic records.
 */
export function generateSyntheticRiskDataset(
  count = 1000,
  seed = 42,
  merchantId = "merchant_default_reclaimai"
): PairedSyntheticRecord[] {
  const rand = createSeededRandom(seed);
  const records: PairedSyntheticRecord[] = [];

  // Anchor start date: e.g. 14 days ago from a fixed reference point for determinism
  const baseTimestamp = new Date("2026-09-01T00:00:00.000Z").getTime();

  for (let i = 0; i < count; i++) {
    const eventIndex = i + 1;
    const eventId = `evt_syn_${String(eventIndex).padStart(6, "0")}`;
    const customerNumber = 1000 + (Math.floor(rand() * 400) + 1); // 400 distinct customers to simulate repeats
    const customerId = `cust_${customerNumber}`;
    const customerEmail = `user_${customerNumber}@domain.test`;
    const orderId = `order_${String(200000 + eventIndex)}`;

    // 1. Pick Category according to realistic e-commerce/fintech distributions
    const catRoll = rand();
    let category: RiskCategoryType;
    if (catRoll < 0.35) {
      category = "TEMPORARY_PAYMENT_FAILURE"; // 35%
    } else if (catRoll < 0.55) {
      category = "INSUFFICIENT_FUNDS"; // 20%
    } else if (catRoll < 0.75) {
      category = "CUSTOMER_ACTION_REQUIRED"; // 20%
    } else if (catRoll < 0.85) {
      category = "REPEATED_PAYMENT_FAILURE"; // 10%
    } else if (catRoll < 0.95) {
      category = "ABANDONED_CHECKOUT"; // 10%
    } else {
      category = "NON_RECOVERABLE"; // 5%
    }

    // 2. Select failure details
    const catalogEntries = FAILURE_CATALOG[category];
    const failureEntry = catalogEntries[Math.floor(rand() * catalogEntries.length)];

    // 3. Payment Method distribution (UPI heavy, standard in India)
    const methodRoll = rand();
    let paymentMethod: PaymentMethodType;
    if (methodRoll < 0.52) paymentMethod = "UPI";
    else if (methodRoll < 0.77) paymentMethod = "CARD";
    else if (methodRoll < 0.89) paymentMethod = "NETBANKING";
    else if (methodRoll < 0.95) paymentMethod = "WALLET";
    else paymentMethod = "EMI";

    // 4. Realistic Amount in paise (Minor units: INR 1 = 100 paise)
    // Distribution:
    // Micro (₹99 - ₹499) ~ 25%
    // Standard (₹500 - ₹2,999) ~ 45%
    // High-value (₹3,000 - ₹14,999) ~ 20%
    // B2B / Large (₹15,000 - ₹95,000) ~ 10%
    const amountRoll = rand();
    let amountInRupees: number;
    if (amountRoll < 0.25) {
      amountInRupees = 99 + Math.floor(rand() * 400);
    } else if (amountRoll < 0.7) {
      amountInRupees = 500 + Math.floor(rand() * 2500);
    } else if (amountRoll < 0.9) {
      amountInRupees = 3000 + Math.floor(rand() * 12000);
    } else {
      amountInRupees = 15000 + Math.floor(rand() * 80000);
    }
    const amountAtRisk = amountInRupees * 100; // in paise

    // 5. Customer Profile & Attempt History
    const tierRoll = rand();
    const customerTier =
      tierRoll < 0.15 ? "VIP" : tierRoll < 0.6 ? "REGULAR" : tierRoll < 0.85 ? "NEW" : "CHURN_RISK";

    const attemptNumber =
      category === "REPEATED_PAYMENT_FAILURE"
        ? 3 + Math.floor(rand() * 3) // 3 to 5
        : 1 + Math.floor(rand() * 2); // 1 or 2

    const recoveryAttemptsCount =
      category === "REPEATED_PAYMENT_FAILURE" ? attemptNumber - 1 : attemptNumber > 1 ? 1 : 0;

    const previousSuccessCount =
      customerTier === "VIP"
        ? 10 + Math.floor(rand() * 30)
        : customerTier === "REGULAR"
          ? 3 + Math.floor(rand() * 8)
          : customerTier === "CHURN_RISK"
            ? 1 + Math.floor(rand() * 3)
            : 0; // NEW has 0

    const previousFailureCount =
      category === "REPEATED_PAYMENT_FAILURE" ? 2 + Math.floor(rand() * 4) : Math.floor(rand() * 2);

    const isSubscription = rand() < 0.25;
    const subscriptionPlanId = isSubscription
      ? `sub_plan_${100 + (customerNumber % 5)}`
      : undefined;

    // Severity computation based on amount and failure catalog
    let severity = failureEntry.severity;
    if (amountAtRisk > 2500000 && severity !== "CRITICAL") {
      severity = "HIGH";
    }

    // Incremental timestamps spread across 14 days
    const eventTimeOffsetMs = Math.floor(rand() * 14 * 86400 * 1000);
    const createdAt = new Date(baseTimestamp + eventTimeOffsetMs);

    // Recovery Eligibility
    const isRecoveryEligible = category !== "NON_RECOVERABLE";

    const event: SyntheticRiskEventInput = {
      id: eventId,
      merchantId,
      category,
      severity,
      amountAtRisk,
      currency: "INR",
      customerId,
      customerEmail,
      orderId,
      paymentMethod,
      failureCode: failureEntry.code,
      failureReason: failureEntry.reason,
      attemptNumber,
      recoveryAttemptsCount,
      customerTier,
      isSubscription,
      subscriptionPlanId,
      isRecoveryEligible,
      previousSuccessCount,
      previousFailureCount,
      metadata: {
        gatewayRef: `gw_ref_${100000 + eventIndex}`,
        syntheticSeed: seed,
        syntheticBatch: "competition_v1",
      },
      createdAt,
    };

    // 6. Independent Ground Truth Generation
    // Ground truth is generated based on business physics of payment systems:
    let isRecoverable = false;
    let recoverableAmount = 0;
    let expectedRecoveryAction = "NONE";
    let simulatedOutcome = "PERMANENT_FAILURE";
    let simulatedRecoveryLatencyHours = 0;
    let evaluationNotes = "";

    switch (category) {
      case "TEMPORARY_PAYMENT_FAILURE": {
        // High recoverability via smart retry
        isRecoverable = true;
        recoverableAmount = amountAtRisk;
        expectedRecoveryAction = "SMART_RETRY";
        simulatedOutcome = "RECOVERED_FULL";
        simulatedRecoveryLatencyHours = 1 + Math.floor(rand() * 3);
        evaluationNotes =
          "Intermittent network issue resolves with scheduled exponential backoff retry.";
        break;
      }
      case "INSUFFICIENT_FUNDS": {
        // Recoverable if timed appropriately (e.g. salary cycles, reminder message)
        const canRecover = rand() < 0.68;
        isRecoverable = canRecover;
        recoverableAmount = canRecover ? amountAtRisk : 0;
        expectedRecoveryAction = canRecover ? "CUSTOMER_DUNNING" : "NONE";
        simulatedOutcome = canRecover ? "RECOVERED_FULL" : "EXPIRED_UNRECOVERED";
        simulatedRecoveryLatencyHours = canRecover ? 12 + Math.floor(rand() * 36) : 72;
        evaluationNotes = canRecover
          ? "Customer topped up funds after automated notification window."
          : "Customer abandoned transaction due to persistent balance shortfall.";
        break;
      }
      case "CUSTOMER_ACTION_REQUIRED": {
        // High recovery with direct dynamic payment link
        const canRecover = rand() < 0.78;
        isRecoverable = canRecover;
        recoverableAmount = canRecover ? amountAtRisk : 0;
        expectedRecoveryAction = "DYNAMIC_PAYMENT_LINK";
        simulatedOutcome = canRecover ? "RECOVERED_FULL" : "EXPIRED_UNRECOVERED";
        simulatedRecoveryLatencyHours = canRecover ? 2 + Math.floor(rand() * 10) : 48;
        evaluationNotes = canRecover
          ? "Customer authenticated successfully via generated 1-click Razorpay payment link."
          : "Customer did not open link before expiry.";
        break;
      }
      case "REPEATED_PAYMENT_FAILURE": {
        // Lower recovery probability, requires human review or specialized checkout assist
        const canRecover = rand() < 0.32;
        isRecoverable = canRecover;
        recoverableAmount = canRecover ? Math.floor(amountAtRisk * 0.9) : 0; // sometimes discounted / partial
        expectedRecoveryAction = "ESCALATE_HUMAN";
        simulatedOutcome = canRecover ? "RECOVERED_PARTIAL" : "PERMANENT_FAILURE";
        simulatedRecoveryLatencyHours = canRecover ? 24 + Math.floor(rand() * 48) : 96;
        evaluationNotes = canRecover
          ? "Customer assisted through manual intervention and alternative payment method."
          : "Multiple repeated attempts exhausted without success.";
        break;
      }
      case "ABANDONED_CHECKOUT": {
        // Recoverable via targeted recovery nudge / cart incentive
        const canRecover = rand() < 0.54;
        isRecoverable = canRecover;
        recoverableAmount = canRecover ? amountAtRisk : 0;
        expectedRecoveryAction = "CHECKOUT_INCENTIVE";
        simulatedOutcome = canRecover ? "RECOVERED_FULL" : "EXPIRED_UNRECOVERED";
        simulatedRecoveryLatencyHours = canRecover ? 4 + Math.floor(rand() * 18) : 48;
        evaluationNotes = canRecover
          ? "Customer converted after receiving automated cart recovery link."
          : "Customer purchased elsewhere or abandoned intent.";
        break;
      }
      case "NON_RECOVERABLE":
      default: {
        isRecoverable = false;
        recoverableAmount = 0;
        expectedRecoveryAction = "NONE";
        simulatedOutcome = "PERMANENT_FAILURE";
        simulatedRecoveryLatencyHours = 0;
        evaluationNotes =
          "Instrument or account permanently invalid. Automated recovery strictly prohibited.";
        break;
      }
    }

    const groundTruth: SyntheticGroundTruth = {
      riskEventId: eventId,
      isRecoverable,
      recoverableAmount,
      expectedRecoveryAction,
      simulatedOutcome,
      simulatedRecoveryLatencyHours,
      evaluationNotes,
    };

    records.push({ event, groundTruth });
  }

  return records;
}
