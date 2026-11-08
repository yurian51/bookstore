import { Injectable, BadRequestException, NotFoundException, Inject } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "./pricing.service";
import { PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment.provider";
import { config } from "../config/config";
import { CurrencyCode } from "@gbs/shared";

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    @Inject(PAYMENT_PROVIDER) private payments: PaymentProvider,
  ) {}

  /**
   * Checkout: prices the cart server-side, creates a pending order, asks the
   * payment provider for a payment, and only grants library access once the
   * provider confirms success. The order is the record; the cart is cleared on success.
   */
  async checkout(userId: string, currency: CurrencyCode, couponCode?: string, shippingAddressId?: string, siteOrigin?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { format: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException("Cart is empty");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    let address = null;
    if (shippingAddressId) {
      address = await this.prisma.address.findFirst({ where: { id: shippingAddressId, userId } });
      if (!address) throw new BadRequestException("Invalid shipping address");
    }

    const hasPhysical = cart.items.some((i) => !i.format.isDigital);
    if (hasPhysical && !address) throw new BadRequestException("A shipping address is required for physical books");

    const priced = await this.pricing.price(
      cart.items.map((i) => ({ formatId: i.formatId, quantity: i.quantity })),
      currency,
      address?.country ?? user.country,
      couponCode,
      hasPhysical,
    );

    const number = `GB-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        number,
        userId,
        currency,
        subtotalMinor: priced.subtotalMinor,
        discountMinor: priced.discountMinor,
        shippingMinor: priced.shippingMinor,
        taxMinor: priced.taxMinor,
        totalMinor: priced.totalMinor,
        addressId: address?.id,
        couponId: priced.couponId,
        items: {
          create: priced.lines.map((l) => ({
            formatId: l.formatId,
            vendorId: l.vendorId,
            quantity: l.quantity,
            unitPriceMinor: l.unitPriceMinor,
            lineTotalMinor: l.lineTotalMinor,
            commissionMinor: l.commissionMinor,
            sellerNetMinor: l.sellerNetMinor,
          })),
        },
      },
    });

    const origin = siteOrigin ?? config.webOrigin;
    const result = await this.payments.createPayment({
      orderId: order.id,
      orderNumber: order.number,
      amountMinor: priced.totalMinor,
      currency,
      customerEmail: user.email,
      returnUrl: `${origin}/orders/${order.number}?status=success`,
      cancelUrl: `${origin}/checkout?status=cancelled`,
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.payments.name,
        providerRef: result.providerRef,
        amountMinor: priced.totalMinor,
        currency,
        status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING",
      },
    });

    if (result.status === "SUCCEEDED") {
      await this.markPaid(order.id);
    }

    return {
      orderNumber: order.number,
      status: result.status === "SUCCEEDED" ? "PAID" : "PENDING_PAYMENT",
      redirectUrl: result.redirectUrl,
      totalMinor: priced.totalMinor,
      currency,
    };
  }

  /**
   * Idempotent. Called from a verified webhook or synchronous success. Grants
   * digital library access, decrements physical inventory, bumps coupon usage,
   * and clears the cart. Running it twice is safe.
   */
  async markPaid(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { format: true } } },
    });
    if (order.status !== "PENDING_PAYMENT") return order;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: "PENDING_PAYMENT" },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (claimed.count === 0) return; // another request already handled it

      for (const item of order.items) {
        if (item.format.isDigital) {
          await tx.libraryEntry.upsert({
            where: { userId_formatId: { userId: order.userId, formatId: item.formatId } },
            update: { revokedAt: null, orderId },
            create: { userId: order.userId, formatId: item.formatId, orderId },
          });
        }
      }

      if (order.couponId) {
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
      }

      await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
    });

    return this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  }

  async listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { format: { include: { book: { select: { title: true, slug: true, coverUrl: true } } } } } } },
    });
  }

  async getForUser(userId: string, number: string) {
    const order = await this.prisma.order.findFirst({
      where: { number, userId },
      include: {
        items: { include: { format: { include: { book: { select: { title: true, slug: true, coverUrl: true } } } } } },
        shipments: true,
        payments: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  /** Customer-initiated cancellation: only before payment has been captured. */
  async cancel(userId: string, number: string) {
    const order = await this.prisma.order.findFirst({ where: { number, userId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "PENDING_PAYMENT") {
      throw new BadRequestException("Paid orders must be refunded through support");
    }
    return this.prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  }
}
