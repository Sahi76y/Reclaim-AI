import fs from "fs";
import path from "path";
import type { PairedSyntheticRecord } from "../server/data/synthetic-generator";
import type { PersistRecommendationInput } from "../server/risk-events/repository";

const EVENTS_PATH = path.join(process.cwd(), "data", "synthetic-risk-events.json");
const RECS_PATH = path.join(process.cwd(), "data", "recommendations.json");

export const EDGE_FIXTURES: PairedSyntheticRecord[] = [
  // 1. Retry-limit case: attemptNumber = 3, recoveryAttemptsCount = 1, amount = ₹2,500, confidence = 0.85
  {
    event: {
      id: "evt_edge_retry_limit",
      merchantId: "merchant_default_reclaimai",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      amountAtRisk: 250000,
      currency: "INR",
      customerId: "cust_edge_01",
      customerEmail: "edge01@example.test",
      orderId: "order_edge_01",
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Temporary gateway timeout",
      attemptNumber: 3,
      recoveryAttemptsCount: 1,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 5,
      previousFailureCount: 0,
      metadata: { fixture: "step_4a_retry_limit" },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    groundTruth: {
      riskEventId: "evt_edge_retry_limit",
      isRecoverable: true,
      recoverableAmount: 250000,
      expectedRecoveryAction: "ESCALATE_HUMAN",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 24,
      evaluationNotes: "Exceeded retry threshold, human escalation required.",
    },
  },
  // 2. High-value case: amount = ₹45,000 (> ₹25,000), all other safety rules pass
  {
    event: {
      id: "evt_edge_high_value",
      merchantId: "merchant_default_reclaimai",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      amountAtRisk: 4500000,
      currency: "INR",
      customerId: "cust_edge_02",
      customerEmail: "edge02@example.test",
      orderId: "order_edge_02",
      paymentMethod: "CARD",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Temporary network latency",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 10,
      previousFailureCount: 0,
      metadata: { fixture: "step_4a_high_value" },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    groundTruth: {
      riskEventId: "evt_edge_high_value",
      isRecoverable: true,
      recoverableAmount: 4500000,
      expectedRecoveryAction: "ESCALATE_HUMAN",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 12,
      evaluationNotes: "High transaction amount exceeds automated limit.",
    },
  },
  // 3. Low-confidence case: confidence = 0.52 (< 0.60), all other safety rules pass
  {
    event: {
      id: "evt_edge_low_confidence",
      merchantId: "merchant_default_reclaimai",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      amountAtRisk: 250000,
      currency: "INR",
      customerId: "cust_edge_03",
      customerEmail: "edge03@example.test",
      orderId: "order_edge_03",
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Temporary network timeout",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 2,
      previousFailureCount: 0,
      metadata: { fixture: "step_4a_low_confidence" },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    groundTruth: {
      riskEventId: "evt_edge_low_confidence",
      isRecoverable: true,
      recoverableAmount: 250000,
      expectedRecoveryAction: "ESCALATE_HUMAN",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 4,
      evaluationNotes: "Low confidence requires human review.",
    },
  },
  // 4. Non-recoverable case: category = NON_RECOVERABLE, recovery eligibility = false
  {
    event: {
      id: "evt_edge_non_recoverable",
      merchantId: "merchant_default_reclaimai",
      category: "NON_RECOVERABLE",
      severity: "LOW",
      amountAtRisk: 250000,
      currency: "INR",
      customerId: "cust_edge_04",
      customerEmail: "edge04@example.test",
      orderId: "order_edge_04",
      paymentMethod: "CARD",
      failureCode: "ACCOUNT_CLOSED_FROZEN",
      failureReason: "Account closed or frozen permanently",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: false,
      previousSuccessCount: 5,
      previousFailureCount: 0,
      metadata: { fixture: "step_4a_non_recoverable" },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    groundTruth: {
      riskEventId: "evt_edge_non_recoverable",
      isRecoverable: false,
      recoverableAmount: 0,
      expectedRecoveryAction: "NONE",
      simulatedOutcome: "EXPIRED_UNRECOVERED",
      simulatedRecoveryLatencyHours: 0,
      evaluationNotes: "Account closed permanently.",
    },
  },
  // 5. Safe Smart Retry: attempt = 1, recoveryAttemptsCount = 0, amount = ₹2,500, confidence = 0.88, regular, eligible, non-critical
  {
    event: {
      id: "evt_edge_safe_smart_retry",
      merchantId: "merchant_default_reclaimai",
      category: "TEMPORARY_PAYMENT_FAILURE",
      severity: "LOW",
      amountAtRisk: 250000,
      currency: "INR",
      customerId: "cust_edge_05",
      customerEmail: "edge05@example.test",
      orderId: "order_edge_05",
      paymentMethod: "UPI",
      failureCode: "GATEWAY_TIMEOUT",
      failureReason: "Temporary gateway timeout",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR",
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 8,
      previousFailureCount: 0,
      metadata: { fixture: "step_4a_safe_smart_retry" },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    groundTruth: {
      riskEventId: "evt_edge_safe_smart_retry",
      isRecoverable: true,
      recoverableAmount: 250000,
      expectedRecoveryAction: "SMART_RETRY",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 2,
      evaluationNotes: "Ideal safe autonomous retry candidate.",
    },
  },
];

export const EDGE_RECOMMENDATIONS: PersistRecommendationInput[] = [
  // 1. Retry-limit recommendation: AI says SMART_RETRY with 0.85 confidence
  {
    riskEventId: "evt_edge_retry_limit",
    action: "SMART_RETRY",
    confidenceScore: 0.85,
    reasoning: "AI recommends retry attempt despite previous failure",
    diagnosisSummary: "Transient network timeout",
    likelyCause: "Acquiring bank timeout",
    severity: "LOW",
    expectedBenefit: "Recover without customer friction",
    safetyFlags: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: false,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    createdAt: new Date("2026-09-01T10:05:00.000Z"),
  },
  // 2. High-value recommendation: AI says SMART_RETRY with 0.88 confidence
  {
    riskEventId: "evt_edge_high_value",
    action: "SMART_RETRY",
    confidenceScore: 0.88,
    reasoning: "Transient network failure on high-value transaction",
    diagnosisSummary: "Network timeout at card switch",
    likelyCause: "Card switch congestion",
    severity: "LOW",
    expectedBenefit: "Recover high value transaction",
    safetyFlags: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: false,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    createdAt: new Date("2026-09-01T10:05:00.000Z"),
  },
  // 3. Low-confidence recommendation: AI says SMART_RETRY with 0.52 confidence (< 0.60)
  {
    riskEventId: "evt_edge_low_confidence",
    action: "SMART_RETRY",
    confidenceScore: 0.52,
    reasoning: "Ambiguous failure telemetry; model uncertain",
    diagnosisSummary: "Unconfirmed gateway status",
    likelyCause: "Unrecognized bank error response",
    severity: "LOW",
    expectedBenefit: "Attempt recovery if transient",
    safetyFlags: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: false,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    createdAt: new Date("2026-09-01T10:05:00.000Z"),
  },
  // 4. Non-recoverable recommendation: AI says NONE with 0.95 confidence
  {
    riskEventId: "evt_edge_non_recoverable",
    action: "NONE",
    confidenceScore: 0.95,
    reasoning: "Account is closed or frozen permanently; no recovery possible",
    diagnosisSummary: "Account closed or frozen permanently",
    likelyCause: "Issuing bank reported account closed",
    severity: "LOW",
    expectedBenefit: "Avoid fraudulent retry overhead and gateway fees",
    safetyFlags: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: true,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    createdAt: new Date("2026-09-01T10:05:00.000Z"),
  },
  // 5. Safe Smart Retry recommendation: AI says SMART_RETRY with 0.88 confidence
  {
    riskEventId: "evt_edge_safe_smart_retry",
    action: "SMART_RETRY",
    confidenceScore: 0.88,
    reasoning: "Transient failure with high historical success",
    diagnosisSummary: "Transient network timeout",
    likelyCause: "Acquiring bank timeout",
    severity: "LOW",
    expectedBenefit: "Seamless frictionless recovery",
    safetyFlags: {
      requiresCustomerAction: false,
      requiresHumanReview: false,
      shouldStopAutomation: false,
    },
    provider: "mock",
    model: "mock-reasoning-v1",
    createdAt: new Date("2026-09-01T10:05:00.000Z"),
  },
];

export function seedEdgeFixtures(): void {
  // 1. Seed events
  if (fs.existsSync(EVENTS_PATH)) {
    const raw = fs.readFileSync(EVENTS_PATH, "utf-8");
    const existing: PairedSyntheticRecord[] = JSON.parse(raw);
    for (const fixture of EDGE_FIXTURES) {
      const idx = existing.findIndex((e) => e.event.id === fixture.event.id);
      if (idx >= 0) {
        existing[idx] = fixture;
      } else {
        existing.push(fixture);
      }
    }
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`Seeded ${EDGE_FIXTURES.length} edge-case event fixtures into ${EVENTS_PATH}`);
  }

  // 2. Seed recommendations
  if (fs.existsSync(RECS_PATH)) {
    const rawRecs = fs.readFileSync(RECS_PATH, "utf-8");
    const existingRecs: PersistRecommendationInput[] = JSON.parse(rawRecs);
    for (const rec of EDGE_RECOMMENDATIONS) {
      const idx = existingRecs.findIndex((r) => r.riskEventId === rec.riskEventId);
      if (idx >= 0) {
        existingRecs[idx] = rec;
      } else {
        existingRecs.push(rec);
      }
    }
    fs.writeFileSync(RECS_PATH, JSON.stringify(existingRecs, null, 2), "utf-8");
    console.log(
      `Seeded ${EDGE_RECOMMENDATIONS.length} edge-case recommendation fixtures into ${RECS_PATH}`
    );
  }
}

if (require.main === module) {
  seedEdgeFixtures();
}
