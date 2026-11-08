import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { isCurrency } from "@gbs/shared";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async ensureCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async get(userId: string) {
    const cart = await this.ensureCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { format: { include: { book: { select: { id: true, slug: true, title: true, coverUrl: true, status: true } } } } },
    });
    return {
      currency: cart.currency,
      items: items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        formatId: i.formatId,
        type: i.format.type,
        priceMinor: i.format.priceMinor,
        currency: i.format.currency,
        book: i.format.book,
        available: i.format.book.status === "PUBLISHED",
      })),
    };
  }

  async add(userId: string, bookId: string, formatId: string, quantity: number) {
    const format = await this.prisma.bookFormat.findFirst({
      where: { id: formatId, bookId, book: { status: "PUBLISHED" } },
      include: { book: true },
    });
    if (!format) throw new NotFoundException("This format is not available for purchase");

    // Digital formats: a user may only own one copy, so quantity is forced to 1.
    if (format.isDigital && quantity !== 1) {
      throw new BadRequestException("Digital formats can only be purchased once");
    }

    const cart = await this.ensureCart(userId);
    const existingDigital = format.isDigital
      ? await this.prisma.libraryEntry.findFirst({
          where: { userId, formatId, revokedAt: null },
        })
      : null;
    if (existingDigital) throw new BadRequestException("You already own this digital book");

    await this.prisma.cartItem.upsert({
      where: { cartId_formatId: { cartId: cart.id, formatId } },
      update: { quantity: format.isDigital ? 1 : { increment: quantity } },
      create: { cartId: cart.id, formatId, quantity },
    });
    return this.get(userId);
  }

  async update(userId: string, itemId: string, quantity: number) {
    const cart = await this.ensureCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { format: true } });
    if (!item) throw new NotFoundException("Cart item not found");
    if (item.format.isDigital && quantity !== 1) throw new BadRequestException("Digital formats are quantity 1");
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.get(userId);
  }

  async remove(userId: string, itemId: string) {
    const cart = await this.ensureCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.get(userId);
  }

  async setCurrency(userId: string, currency: string) {
    if (!isCurrency(currency)) throw new BadRequestException("Unsupported currency");
    const cart = await this.ensureCart(userId);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { currency } });
    return this.get(userId);
  }
}
