import crypto from "crypto";
import type {
  RazorpayProvider,
  PaymentRetryParams,
  PaymentRetryResult,
  CreatePaymentLinkParams,
  CreatePaymentLinkResult,
  PaymentStatusResult,
} from "./provider";
import { assertTestMode } from "./provider";

/**
 * Mock Razorpay Provider for local tests and deterministic evaluation.
 * STRICTLY LOCKED TO TEST MODE.
 */
export class MockRazorpayProvider implements RazorpayProvider {
  public readonly mode = "test" as const;

  public async retryPayment(params: PaymentRetryParams): Promise<PaymentRetryResult> {
    assertTestMode();

    if (params.amount <= 0) {
      return {
        success: false,
        providerReference: `pay_test_err_${Date.now()}`,
        recoveredAmount: 0,
        status: "FAILED",
        failureReason: "Invalid retry amount: must be greater than 0",
        gatewayTimestamp: new Date().toISOString(),
      };
    }

    // Deterministic test-mode reference
    const hash = crypto
      .createHash("sha256")
      .update(`${params.idempotencyKey}:${params.amount}:${params.currency}`)
      .digest("hex")
      .substring(0, 14);

    const providerReference = `pay_test_${hash}`;

    return {
      success: true,
      providerReference,
      recoveredAmount: params.amount,
      status: "SUCCESS",
      gatewayTimestamp: new Date().toISOString(),
    };
  }

  public async createPaymentLink(
    params: CreatePaymentLinkParams
  ): Promise<CreatePaymentLinkResult> {
    assertTestMode();

    if (params.amount <= 0) {
      return {
        success: false,
        providerReference: `plink_test_err_${Date.now()}`,
        paymentLinkUrl: "",
        amount: 0,
        currency: params.currency,
        status: "FAILED",
        expiryAt: new Date().toISOString(),
        failureReason: "Payment link amount must be greater than 0",
      };
    }

    if (params.currency.toUpperCase() !== "INR") {
      return {
        success: false,
        providerReference: `plink_test_err_${Date.now()}`,
        paymentLinkUrl: "",
        amount: params.amount,
        currency: params.currency,
        status: "FAILED",
        expiryAt: new Date().toISOString(),
        failureReason: "Only INR is supported for Razorpay test-mode payment links",
      };
    }

    // Bounded expiry: default 48h (2880 mins), capped at 72h (4320 mins), minimum 15 mins
    const boundedMinutes = Math.min(Math.max(params.expiryMinutes ?? 2880, 15), 4320);
    const expiryDate = new Date(Date.now() + boundedMinutes * 60 * 1000);

    const hash = crypto
      .createHash("sha256")
      .update(`${params.idempotencyKey}:${params.amount}:${params.description}`)
      .digest("hex")
      .substring(0, 14);

    const providerReference = `plink_test_${hash}`;
    const paymentLinkUrl = `https://rzp.io/i/test_${hash}`;

    return {
      success: true,
      providerReference,
      paymentLinkUrl,
      amount: params.amount,
      currency: "INR",
      status: "PENDING",
      expiryAt: expiryDate.toISOString(),
    };
  }

  public async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    assertTestMode();

    return {
      paymentId,
      status: "SUCCESS",
      amount: 100000,
      currency: "INR",
      providerReference: paymentId,
    };
  }
}
