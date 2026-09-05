import { describe, it, expect } from "vitest";
import {
  generateSyntheticRiskDataset,
  type RiskCategoryType,
} from "../server/data/synthetic-generator";

describe("Synthetic Dataset Generator", () => {
  it("generates deterministic records for identical seeds", () => {
    const run1 = generateSyntheticRiskDataset(100, 42);
    const run2 = generateSyntheticRiskDataset(100, 42);

    expect(run1.length).toBe(100);
    expect(run2.length).toBe(100);

    // Deep equality check on both runs
    expect(run1).toEqual(run2);

    // Specific field checks
    expect(run1[0].event.id).toBe(run2[0].event.id);
    expect(run1[0].event.amountAtRisk).toBe(run2[0].event.amountAtRisk);
    expect(run1[0].groundTruth.recoverableAmount).toBe(run2[0].groundTruth.recoverableAmount);
  });

  it("produces different records when seed varies", () => {
    const runA = generateSyntheticRiskDataset(50, 42);
    const runB = generateSyntheticRiskDataset(50, 999);

    expect(runA.length).toBe(50);
    expect(runB.length).toBe(50);

    // The first event should differ between different seeds
    expect(runA[0].event.amountAtRisk).not.toBe(runB[0].event.amountAtRisk);
  });

  it("supports configurable event count", () => {
    const dataset50 = generateSyntheticRiskDataset(50, 42);
    const dataset250 = generateSyntheticRiskDataset(250, 42);

    expect(dataset50.length).toBe(50);
    expect(dataset250.length).toBe(250);
  });

  it("covers all 6 required risk categories in 1000 events", () => {
    const dataset = generateSyntheticRiskDataset(1000, 42);
    const categoriesPresent = new Set(dataset.map((d) => d.event.category));

    const expectedCategories: RiskCategoryType[] = [
      "TEMPORARY_PAYMENT_FAILURE",
      "INSUFFICIENT_FUNDS",
      "CUSTOMER_ACTION_REQUIRED",
      "REPEATED_PAYMENT_FAILURE",
      "ABANDONED_CHECKOUT",
      "NON_RECOVERABLE",
    ];

    for (const cat of expectedCategories) {
      expect(categoriesPresent.has(cat)).toBe(true);
    }
  });

  it("strictly enforces ground-truth isolation on input features", () => {
    const dataset = generateSyntheticRiskDataset(10, 42);

    for (const record of dataset) {
      // Input features should NOT contain ground truth fields
      const inputKeys = Object.keys(record.event);
      expect(inputKeys).not.toContain("isRecoverable");
      expect(inputKeys).not.toContain("recoverableAmount");
      expect(inputKeys).not.toContain("expectedRecoveryAction");
      expect(inputKeys).not.toContain("simulatedOutcome");

      // Ground truth should contain evaluation outcomes
      expect(record.groundTruth).toHaveProperty("isRecoverable");
      expect(record.groundTruth).toHaveProperty("recoverableAmount");
      expect(record.groundTruth).toHaveProperty("expectedRecoveryAction");
    }
  });

  it("marks NON_RECOVERABLE events as zero recoverable amount in ground truth", () => {
    const dataset = generateSyntheticRiskDataset(500, 42);
    const nonRecoverable = dataset.filter((d) => d.event.category === "NON_RECOVERABLE");

    expect(nonRecoverable.length).toBeGreaterThan(0);

    for (const item of nonRecoverable) {
      expect(item.event.isRecoveryEligible).toBe(false);
      expect(item.groundTruth.isRecoverable).toBe(false);
      expect(item.groundTruth.recoverableAmount).toBe(0);
      expect(item.groundTruth.expectedRecoveryAction).toBe("NONE");
    }
  });
});
