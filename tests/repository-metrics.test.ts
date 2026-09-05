import { describe, it, expect } from "vitest";
import { generateSyntheticRiskDataset } from "../server/data/synthetic-generator";
import {
  calculateMetricsFromRecords,
  createRiskEvent,
  getRiskEvents,
  getRiskEventWithGroundTruth,
} from "../server/risk-events/repository";

describe("Repository & Metrics Aggregation", () => {
  it("accurately calculates aggregate revenue metrics from records", () => {
    const records = generateSyntheticRiskDataset(200, 42);
    const metrics = calculateMetricsFromRecords(records, "local_store");

    expect(metrics.totalEvents).toBe(200);
    expect(metrics.totalAmountAtRiskPaise).toBeGreaterThan(0);
    expect(metrics.totalRecoverableAmountPaise).toBeGreaterThan(0);

    // Mathematical identity: at risk = recoverable + non-recoverable
    expect(metrics.totalAmountAtRiskPaise).toBe(
      metrics.totalRecoverableAmountPaise + metrics.totalNonRecoverableAmountPaise
    );

    // Sum of category counts must equal total events
    const categoryCountSum = Object.values(metrics.categoryBreakdown).reduce(
      (acc, val) => acc + val.count,
      0
    );
    expect(categoryCountSum).toBe(200);

    // Percentage must be between 0 and 100
    expect(metrics.recoverablePercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.recoverablePercentage).toBeLessThanOrEqual(100);
  });

  it("persists and retrieves ingested risk events through repository", async () => {
    const testId = `evt_test_unit_${Date.now()}`;
    const testEvent = {
      id: testId,
      merchantId: "merchant_test_repo",
      category: "INSUFFICIENT_FUNDS" as const,
      severity: "HIGH" as const,
      amountAtRisk: 50000,
      currency: "INR",
      customerId: "cust_test_99",
      customerEmail: "cust_test_99@test.com",
      orderId: "order_test_99",
      paymentMethod: "UPI" as const,
      failureCode: "BANK_INSUFFICIENT_BALANCE",
      failureReason: "Insufficient funds in bank account",
      attemptNumber: 1,
      recoveryAttemptsCount: 0,
      customerTier: "REGULAR" as const,
      isSubscription: false,
      isRecoveryEligible: true,
      previousSuccessCount: 2,
      previousFailureCount: 0,
      createdAt: new Date(),
    };

    const groundTruth = {
      riskEventId: testId,
      isRecoverable: true,
      recoverableAmount: 50000,
      expectedRecoveryAction: "CUSTOMER_DUNNING",
      simulatedOutcome: "RECOVERED_FULL",
      simulatedRecoveryLatencyHours: 12,
      evaluationNotes: "Test evaluation notes",
    };

    const created = await createRiskEvent(testEvent, groundTruth);
    expect(created.event.id).toBe(testId);
    expect(["database", "local_store"]).toContain(created.persistedVia);

    // Verify retrieval without ground truth
    const retrievedEvents = await getRiskEvents({ merchantId: "merchant_test_repo" });
    const found = retrievedEvents.find((e) => e.id === testId);
    expect(found).toBeDefined();
    // Verify no ground truth leaked into input features
    expect(found).not.toHaveProperty("isRecoverable");

    // Verify evaluation retrieval with ground truth
    const evaluationRecord = await getRiskEventWithGroundTruth(testId);
    expect(evaluationRecord).not.toBeNull();
    if (evaluationRecord) {
      expect(evaluationRecord.groundTruth.isRecoverable).toBe(true);
      expect(evaluationRecord.groundTruth.recoverableAmount).toBe(50000);
    }
  });
});
