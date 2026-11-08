import { Module } from "@nestjs/common";
import { PAYMENT_PROVIDER, PaymentProvider } from "./payment.provider";
import { SandboxPaymentProvider } from "./sandbox.provider";
import { StripePaymentProvider } from "./stripe.provider";
import { config } from "../config/config";

@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (): PaymentProvider => {
        switch (config.paymentProvider) {
          case "stripe":
            return new StripePaymentProvider(process.env.STRIPE_SECRET_KEY ?? "");
          default:
            return new SandboxPaymentProvider();
        }
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
