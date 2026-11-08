import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { config } from "../config/config";
import { splitSale, CurrencyCode } from "@gbs/shared";

export interface PricedLine {
  formatId: string;
  vendorId: string | null;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  commissionMinor: number;
  sellerNetMinor: number;
  isDigital: boolean;
}

export interface PricedOrder {
  currency: CurrencyCode;
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  couponId: string | null;
}

/**
 * Single source of truth for what an order costs. Checkout never trusts prices
 * sent by the client: everything is re-priced here from the database.
 */
@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async price(
    cartItems: { formatId: string; quantity: number }[],
    currency: CurrencyCode,
    countryCode: string,
    couponCode?: string,
    hasPhysical = false,
  ): Promise<PricedOrder> {
    if (cartItems.length === 0) throw new BadRequestException("Cart is empty");

    const formats = await this.prisma.bookFormat.findMany({
      where: { id: { in: cartItems.map((i) => i.formatId) } },
      include: {
        book: { include: { vendor: true, priceRules: true } },
        priceRules: true,
      },
    });

    const lines: PricedLine[] = cartItems.map((ci) => {
      const f = formats.find((x) => x.id === ci.formatId);
      if (!f || f.book.status !== "PUBLISHED") throw new BadRequestException("An item is no longer available");

      // Country-specific price rule wins over the format's base price, but only in the same currency.
      const override = f.priceRules.find((r) => r.countryCode === countryCode && r.currency === currency);
      const unit = override?.priceMinor ?? (f.currency === currency ? f.priceMinor : null);
      if (unit === null) {
        throw new BadRequestException(`No ${currency} price configured for this format`);
      }

      const lineTotal = unit * ci.quantity;
      const commissionBps = f.book.vendor?.commissionBps ?? config.platformCommissionBps;
      const split = splitSale(lineTotal, commissionBps);

      return {
        formatId: f.id,
        vendorId: f.book.vendorId,
        quantity: ci.quantity,
        unitPriceMinor: unit,
        lineTotalMinor: lineTotal,
        commissionMinor: split.commissionMinor,
        sellerNetMinor: split.sellerNetMinor,
        isDigital: f.isDigital,
      };
    });

    const subtotalMinor = lines.reduce((s, l) => s + l.lineTotalMinor, 0);

    const { discountMinor, couponId } = await this.applyCoupon(couponCode, subtotalMinor, currency);

    const taxableMinor = subtotalMinor - discountMinor;
    const taxRate = await this.prisma.taxRate.findUnique({ where: { country: countryCode } });
    const taxMinor = taxRate ? Math.round((taxableMinor * taxRate.rateBps) / 10_000) : 0;

    const shippingMinor = hasPhysical ? await this.shippingFor(countryCode, currency) : 0;

    const totalMinor = taxableMinor + taxMinor + shippingMinor;

    return { currency, lines, subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor, couponId };
  }

  private async applyCoupon(code: string | undefined, subtotal: number, currency: CurrencyCode) {
    if (!code) return { discountMinor: 0, couponId: null };
    const now = new Date();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.active) throw new BadRequestException("Invalid coupon");
    if (coupon.validFrom && now < coupon.validFrom) throw new BadRequestException("Coupon not yet active");
    if (coupon.validUntil && now > coupon.validUntil) throw new BadRequestException("Coupon expired");
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException("Coupon exhausted");
    if (coupon.currency && coupon.currency !== currency) throw new BadRequestException("Coupon not valid in this currency");

    let discount = 0;
    if (coupon.percentBps) discount = Math.round((subtotal * coupon.percentBps) / 10_000);
    if (coupon.amountMinor) discount = Math.max(discount, coupon.amountMinor);
    discount = Math.min(discount, subtotal);
    return { discountMinor: discount, couponId: coupon.id };
  }

  private async shippingFor(countryCode: string, currency: CurrencyCode) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: { countries: { contains: countryCode }, currency },
    });
    return zone?.baseFeeMinor ?? 0;
  }
}
