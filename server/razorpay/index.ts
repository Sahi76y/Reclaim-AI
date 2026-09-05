/**
 * Razorpay Test Mode Module
 *
 * Scope: Handles test-mode recovery actions (Retries, Payment Links)
 * STRICTLY LOCKED TO TEST MODE. Production mode is physically blocked.
 */

export * from "./provider";
export * from "./mock-provider";
export * from "./test-provider";

import type { RazorpayProvider } from "./provider";
import { MockRazorpayProvider } from "./mock-provider";
import { RazorpayTestProvider } from "./test-provider";

let defaultProviderInstance: RazorpayProvider | null = null;

export function getRazorpayProvider(
  providerType: "SIMULATOR" | "RAZORPAY_TEST" = "RAZORPAY_TEST"
): RazorpayProvider {
  if (providerType === "SIMULATOR") {
    return new MockRazorpayProvider();
  }
  if (!defaultProviderInstance) {
    defaultProviderInstance = new RazorpayTestProvider();
  }
  return defaultProviderInstance;
}
