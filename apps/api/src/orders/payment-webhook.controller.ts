import { Controller, Post, Req, Headers, HttpCode, Inject, BadRequestException } from "@nestjs/common";
import { Request } from "express";
import { OrdersService } from "./orders.service";
import { PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment.provider";

@Controller("payments")
export class PaymentWebhookController {
  constructor(
    private orders: OrdersService,
    @Inject(PAYMENT_PROVIDER) private provider: PaymentProvider,
  ) {}

  /** Provider callback. Unverified requests are rejected by the provider before any state changes. */
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!req.rawBody) throw new BadRequestException("Raw body unavailable");
    const event = this.provider.verifyWebhook(req.rawBody, headers);
    if (!event) return { received: true };
    if (event.status === "SUCCEEDED") {
      await this.orders.markPaidByProviderRef(event.providerRef, event.amountMinor, event.currency);
    } else {
      await this.orders.markFailedByProviderRef(event.providerRef);
    }
    return { received: true };
  }
}
