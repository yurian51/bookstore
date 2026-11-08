import { PaymentProvider, CreatePaymentInput, CreatePaymentResult, WebhookEvent } from "./payment.provider";

/**
 * Stripe adapter using hosted Checkout, so no card data touches this server.
 * Not yet wired to the Stripe SDK: the call sites are marked TODO and throw
 * until implemented, so a misconfigured launch fails loudly instead of silently.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  constructor(private secretKey: string) {
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required for the Stripe provider");
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // TODO(launch): stripe.checkout.sessions.create({ mode: "payment", ... })
    throw new Error(`Stripe adapter not yet wired (order ${input.orderNumber})`);
  }

  async refund(_providerRef: string, _amountMinor: number) {
    // TODO(launch): stripe.refunds.create({ payment_intent, amount })
    throw new Error("Stripe refund not yet wired");
  }

  verifyWebhook(_rawBody: Buffer, _headers: Record<string, string | undefined>): WebhookEvent | null {
    // TODO(launch): stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    throw new Error("Stripe webhook verification not yet wired");
  }
}
