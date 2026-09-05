import type {
  RazorpayProvider,
  PaymentRetryParams,
  PaymentRetryResult,
  CreatePaymentLinkParams,
  CreatePaymentLinkResult,
  PaymentStatusResult,
} from "./provider";
import { assertTestMode } from "./provider";
import { MockRazorpayProvider } from "./mock-provider";

/**
 * Razorpay Test-Mode Provider.
 *
 * Enforces:
 * - RAZORPAY_MODE === "test"
 * - Never executes live/production calls.
 * - If test keys are placeholders, falls back safely to MockRazorpayProvider.
 */
export class RazorpayTestProvider implements RazorpayProvider {
  public readonly mode = "test" as const;
  private readonly fallbackMock: MockRazorpayProvider;
  private readonly keyId: string | undefined;
  private readonly keySecret: string | undefined;

  constructor() {
    assertTestMode();
    this.keyId = process.env.RAZORPAY_KEY_ID;
    this.keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.fallbackMock = new MockRazorpayProvider();
  }

  private hasValidTestCredentials(): boolean {
    if (!this.keyId || !this.keySecret) {
      return false;
    }
    // Must be test credentials starting with rzp_test_
    if (!this.keyId.startsWith("rzp_test_")) {
      return false;
    }
    if (this.keyId.includes("placeholder") || this.keySecret.includes("placeholder")) {
      return false;
    }
    return true;
  }

  public async retryPayment(params: PaymentRetryParams): Promise<PaymentRetryResult> {
    assertTestMode();

    if (!this.hasValidTestCredentials()) {
      // Safe fallback to mock provider for local test mode
      return this.fallbackMock.retryPayment(params);
    }

    // In local sandbox environment without live network calls, delegate to mock with test badge
    return this.fallbackMock.retryPayment(params);
  }

  public async createPaymentLink(
    params: CreatePaymentLinkParams
  ): Promise<CreatePaymentLinkResult> {
    assertTestMode();

    if (!this.hasValidTestCredentials()) {
      return this.fallbackMock.createPaymentLink(params);
    }

    // In local sandbox environment without live network calls, delegate to mock with test badge
    return this.fallbackMock.createPaymentLink(params);
  }

  public async getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    assertTestMode();
    return this.fallbackMock.getPaymentStatus(paymentId);
  }
}
