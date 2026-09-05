import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/server/ai/mock-provider";
import { OpenAIProvider } from "@/server/ai/openai-provider";
import { getAIProvider, OpenAIAPIKeyMissingError } from "@/server/ai";
import type { AIInputDTO } from "@/server/ai/types";

describe("AI Provider Implementations & Abstraction", () => {
  const baseInput: AIInputDTO = {
    eventId: "evt_test_provider",
    amountAtRisk: 250000,
    amountAtRiskINR: 2500,
    currency: "INR",
    category: "TEMPORARY_PAYMENT_FAILURE",
    severity: "LOW",
    paymentMethod: "UPI",
    failureCode: "BAD_REQUEST_GATEWAY_TIMEOUT",
    failureReason: "Gateway timed out responding",
    attemptNumber: 1,
    recoveryAttemptsCount: 0,
    customerTier: "REGULAR",
    isSubscription: false,
    previousSuccessCount: 4,
    previousFailureCount: 0,
    isRecoveryEligible: true,
  };

  describe("MockAIProvider (Deterministic Reasoning)", () => {
    const mockProvider = new MockAIProvider();

    it("returns identical recommendations for identical inputs (determinism)", async () => {
      const rec1 = await mockProvider.diagnoseAndRecommend(baseInput);
      const rec2 = await mockProvider.diagnoseAndRecommend(baseInput);

      expect(rec1.recommendation.action).toBe(rec2.recommendation.action);
      expect(rec1.recommendation.confidence).toBe(rec2.recommendation.confidence);
      expect(rec1.diagnosis.likelyCause).toBe(rec2.diagnosis.likelyCause);
      expect(rec1.safety.requiresHumanReview).toBe(rec2.safety.requiresHumanReview);
    });

    it("recommends SMART_RETRY for transient payment failure on first attempt", async () => {
      const rec = await mockProvider.diagnoseAndRecommend(baseInput);
      expect(rec.recommendation.action).toBe("SMART_RETRY");
      expect(rec.recommendation.confidence).toBeGreaterThanOrEqual(0.8);
      expect(rec.safety.requiresHumanReview).toBe(false);
      expect(rec.safety.shouldStopAutomation).toBe(false);
    });

    it("recommends DYNAMIC_PAYMENT_LINK for OTP / authentication failures", async () => {
      const otpInput: AIInputDTO = {
        ...baseInput,
        category: "CUSTOMER_ACTION_REQUIRED",
        failureCode: "PAYMENT_OTP_EXPIRED",
        failureReason: "Customer OTP verification timed out",
      };

      const rec = await mockProvider.diagnoseAndRecommend(otpInput);
      expect(rec.recommendation.action).toBe("DYNAMIC_PAYMENT_LINK");
      expect(rec.safety.requiresCustomerAction).toBe(true);
      expect(rec.recommendation.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("recommends ESCALATE_HUMAN for high retry counts and churn risk customers", async () => {
      const repeatedFailureInput: AIInputDTO = {
        ...baseInput,
        category: "REPEATED_PAYMENT_FAILURE",
        failureCode: "TRANSACTION_LIMIT_EXCEEDED",
        failureReason: "Payment limit exceeded 3 consecutive times",
        attemptNumber: 4,
        recoveryAttemptsCount: 3,
        customerTier: "CHURN_RISK",
        previousFailureCount: 5,
      };

      const rec = await mockProvider.diagnoseAndRecommend(repeatedFailureInput);
      expect(rec.recommendation.action).toBe("ESCALATE_HUMAN");
      expect(rec.safety.requiresHumanReview).toBe(true);
      expect(rec.safety.shouldStopAutomation).toBe(true);
    });

    it("recommends NONE for non-recoverable payment failures", async () => {
      const nonRecoverableInput: AIInputDTO = {
        ...baseInput,
        category: "NON_RECOVERABLE",
        failureCode: "CARD_STOLEN_BLOCKED",
        failureReason: "Card reported lost or stolen by cardholder",
        isRecoveryEligible: false,
      };

      const rec = await mockProvider.diagnoseAndRecommend(nonRecoverableInput);
      expect(rec.recommendation.action).toBe("NONE");
      expect(rec.safety.shouldStopAutomation).toBe(true);
      expect(rec.recommendation.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("recommends CUSTOMER_DUNNING for insufficient funds on subscription renewals", async () => {
      const subInput: AIInputDTO = {
        ...baseInput,
        category: "INSUFFICIENT_FUNDS",
        failureCode: "INSUFFICIENT_BALANCE",
        failureReason: "Account balance insufficient to complete debit",
        isSubscription: true,
        subscriptionPlanId: "plan_pro_monthly",
        attemptNumber: 2,
      };

      const rec = await mockProvider.diagnoseAndRecommend(subInput);
      expect(rec.recommendation.action).toBe("CUSTOMER_DUNNING");
      expect(rec.safety.requiresCustomerAction).toBe(true);
    });
  });

  describe("AI Provider Abstraction Factory", () => {
    it("returns MockAIProvider when requested explicitly or defaulted", () => {
      const provider = getAIProvider("mock");
      expect(provider.name).toBe("mock");
    });

    it("returns OpenAIProvider when requested", () => {
      const provider = getAIProvider("openai");
      expect(provider.name).toBe("openai");
    });

    it("OpenAIProvider throws clear OpenAIAPIKeyMissingError when key is absent", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const openAiProvider = new OpenAIProvider();
      await expect(openAiProvider.diagnoseAndRecommend(baseInput)).rejects.toThrow(
        OpenAIAPIKeyMissingError
      );

      // Restore
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });
  });
});
