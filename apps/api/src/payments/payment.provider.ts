/**
 * Every payment gateway implements this interface. Checkout depends only on this
 * contract, so Stripe, PayPal, Apple/Google Pay and mobile money plug in without
 * changing order logic. Card data never reaches this application: providers
 * receive amounts and return hosted-checkout URLs or references.
 */
export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentResult {
  providerRef: string;
  redirectUrl: string | null; // null = completed synchronously (sandbox only)
  status: "PENDING" | "SUCCEEDED";
}

export interface WebhookEvent {
  providerRef: string;
  status: "SUCCEEDED" | "FAILED";
  amountMinor: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  refund(providerRef: string, amountMinor: number): Promise<{ refundRef: string }>;
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): WebhookEvent | null;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
