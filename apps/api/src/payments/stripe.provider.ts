import Stripe from "stripe";
import { UnauthorizedException, ServiceUnavailableException } from "@nestjs/common";
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult, WebhookEvent } from "./payment.provider";

/**
 * Stripe Checkout (hosted page). No card data reaches this server.
 * Currency note: confirm your Stripe account supports each presentment currency
 * (TZS, KES, USD, EUR, GBP) before enabling it for customers.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: Stripe;

  constructor(secretKey: string, private readonly webhookSecret: string) {
    if (!secretKey || !webhookSecret) {
      throw new Error("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required for the Stripe provider");
    }
    this.stripe = new Stripe(secretKey);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      client_reference_id: input.orderId,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountMinor, // minor units; TZS is zero-decimal in Stripe
            product_data: { name: `Global Bookstore order ${input.orderNumber}` },
          },
        },
      ],
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) throw new ServiceUnavailableException("Payment page is unavailable");
    return { providerRef: session.id, redirectUrl: session.url, status: "PENDING" };
  }

  async refund(providerRef: string, amountMinor: number) {
    const session = await this.stripe.checkout.sessions.retrieve(providerRef);
    const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!pi) throw new ServiceUnavailableException("No captured payment for this order");
    const refund = await this.stripe.refunds.create({ payment_intent: pi, amount: amountMinor });
    return { refundRef: refund.id };
  }

  /** Throws on a bad signature so the webhook returns 401 and Stripe retries nothing forged. */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): WebhookEvent | null {
    const signature = headers["stripe-signature"];
    if (!signature) throw new UnauthorizedException("Missing signature");

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status !== "paid") return null; // async method still pending
      return {
        providerRef: s.id,
        status: "SUCCEEDED",
        amountMinor: s.amount_total ?? -1,
        currency: (s.currency ?? "").toUpperCase(),
      };
    }
    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const s = event.data.object as Stripe.Checkout.Session;
      return { providerRef: s.id, status: "FAILED", amountMinor: 0, currency: "" };
    }
    return null;
  }
}
