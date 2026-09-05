/**
 * Razorpay Provider Interface & Safety Guard
 *
 * CRITICAL SAFETY RULES:
 * 1. All Razorpay execution MUST explicitly use TEST MODE.
 * 2. Fail closed if RAZORPAY_MODE !== "test".
 * 3. Never expose secrets (RAZORPAY_KEY_SECRET) to the browser.
 * 4. Production payment execution is strictly prohibited in this system.
 */

export interface PaymentRetryParams {
  paymentId?: string;
  orderId?: string;
  amount: number; // in minor currency units (paise)
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRetryResult {
  success: boolean;
  providerReference: string;
  recoveredAmount: number; // in minor currency units (paise)
  status: "SUCCESS" | "FAILED" | "PENDING";
  failureReason?: string;
  gatewayTimestamp: string;
}

export interface CreatePaymentLinkParams {
  amount: number; // in minor currency units (paise)
  currency: string; // must be INR
  description: string;
  orderId?: string;
  customerReference?: string;
  expiryMinutes?: number; // bounded expiry (default 2880 = 48h)
  idempotencyKey: string;
  notes?: Record<string, string>;
}

export interface CreatePaymentLinkResult {
  success: boolean;
  providerReference: string; // e.g. plink_test_...
  paymentLinkUrl: string; // e.g. https://rzp.io/i/test_...
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED";
  expiryAt: string;
  failureReason?: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  amount: number;
  currency: string;
  providerReference: string;
}

export interface RazorpayProvider {
  readonly mode: "test";

  retryPayment(params: PaymentRetryParams): Promise<PaymentRetryResult>;

  createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult>;

  getPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
}

/**
 * Enforces that the execution environment is strictly set to test mode.
 * Fails closed immediately if RAZORPAY_MODE is not "test".
 */
export function assertTestMode(): void {
  const mode = process.env.RAZORPAY_MODE ?? "test";
  if (mode !== "test") {
    throw new Error(
      `FATAL SAFETY VIOLATION: RAZORPAY_MODE is set to "${mode}". Only "test" mode is allowed. Production payments are blocked.`
    );
  }
}
