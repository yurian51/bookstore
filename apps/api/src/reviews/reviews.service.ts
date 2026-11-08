import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Only verified buyers (anyone who owns the book in any format) may review. */
  async upsert(userId: string, bookId: string, rating: number, title?: string, body?: string) {
    const owned = await this.prisma.orderItem.findFirst({
      where: { order: { userId, status: { in: ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] } }, format: { bookId } },
    });
    if (!owned) throw new ForbiddenException("Only buyers of this book can review it");

    return this.prisma.review.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { rating, title, body },
      create: { userId, bookId, rating, title, body },
    });
  }

  async toggleWishlist(userId: string, bookId: string, on: boolean) {
    if (on) {
      await this.prisma.wishlistItem.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: {},
        create: { userId, bookId },
      });
    } else {
      await this.prisma.wishlistItem.deleteMany({ where: { userId, bookId } });
    }
    return { ok: true };
  }

  async wishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { book: { select: { id: true, slug: true, title: true, coverUrl: true } } },
    });
  }
}
