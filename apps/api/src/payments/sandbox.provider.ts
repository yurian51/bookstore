import { randomBytes } from "crypto";
import { PaymentProvider, CreatePaymentInput, CreatePaymentResult, WebhookEvent } from "./payment.provider";

/** Development-only. Completes payments immediately. Refuses to run in production. */
export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = "sandbox";

  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Sandbox payment provider cannot be used in production");
    }
  }

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { providerRef: `sbx_${randomBytes(12).toString("hex")}`, redirectUrl: null, status: "SUCCEEDED" };
  }

  async refund(_providerRef: string, _amountMinor: number) {
    return { refundRef: `sbx_rf_${randomBytes(12).toString("hex")}` };
  }

  verifyWebhook(_rawBody: Buffer, _headers: Record<string, string | undefined>): WebhookEvent | null {
    return null;
  }
}
