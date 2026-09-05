import { describe, it, expect } from "vitest";
import { riskEventIngestionSchema } from "../lib/validations/risk-event";

describe("Risk Event Ingestion Schema Validation", () => {
  const validPayload = {
    id: "evt_test_001",
    merchantId: "merchant_default_reclaimai",
    category: "TEMPORARY_PAYMENT_FAILURE",
    severity: "HIGH",
    amountAtRisk: 250000, // 2500 INR in paise
    currency: "INR",
    customerId: "cust_101",
    customerEmail: "cust_101@test.com",
    orderId: "order_901",
    paymentMethod: "UPI",
    failureCode: "GATEWAY_TIMEOUT",
    failureReason: "Payment gateway timed out waiting for issuing bank switch",
    attemptNumber: 1,
    recoveryAttemptsCount: 0,
    customerTier: "REGULAR",
    isSubscription: false,
    isRecoveryEligible: true,
    previousSuccessCount: 5,
    previousFailureCount: 0,
    metadata: {
      source: "web_checkout",
    },
  };

  it("successfully validates a well-formed ingestion payload", () => {
    const result = riskEventIngestionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("evt_test_001");
      expect(result.data.amountAtRisk).toBe(250000);
      expect(result.data.category).toBe("TEMPORARY_PAYMENT_FAILURE");
    }
  });

  it("rejects payload with missing required fields", () => {
    const invalid = { ...validPayload };
    // @ts-expect-error testing missing property
    delete invalid.amountAtRisk;

    const result = riskEventIngestionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors).toHaveProperty("amountAtRisk");
    }
  });

  it("rejects negative or zero amount at risk", () => {
    const negative = { ...validPayload, amountAtRisk: -500 };
    const resultNeg = riskEventIngestionSchema.safeParse(negative);
    expect(resultNeg.success).toBe(false);

    const zero = { ...validPayload, amountAtRisk: 0 };
    const resultZero = riskEventIngestionSchema.safeParse(zero);
    expect(resultZero.success).toBe(false);
  });

  it("rejects non-integer minor unit amounts", () => {
    const floatAmount = { ...validPayload, amountAtRisk: 1499.5 };
    const result = riskEventIngestionSchema.safeParse(floatAmount);
    expect(result.success).toBe(false);
  });

  it("rejects invalid risk category", () => {
    const invalidCategory = { ...validPayload, category: "UNSUPPORTED_RANDOM_ERROR" };
    const result = riskEventIngestionSchema.safeParse(invalidCategory);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty("category");
    }
  });

  it("rejects invalid customer email format", () => {
    const invalidEmail = { ...validPayload, customerEmail: "not-an-email" };
    const result = riskEventIngestionSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty("customerEmail");
    }
  });
});
