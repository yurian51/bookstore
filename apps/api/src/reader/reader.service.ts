import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { signPayload, verifyPayload } from "../common/crypto";
import { config } from "../config/config";
import { randomUUID } from "crypto";

interface DeliveryToken {
  uid: string;
  fmt: string;
  exp: number;
  jti: string;
}

@Injectable()
export class ReaderService {
  constructor(private prisma: PrismaService) {}

  async library(userId: string) {
    const entries = await this.prisma.libraryEntry.findMany({
      where: { userId, revokedAt: null },
      orderBy: { grantedAt: "desc" },
      include: {
        format: {
          include: {
            book: { select: { id: true, slug: true, title: true, coverUrl: true, authors: { include: { author: true }, take: 2 } } },
          },
        },
      },
    });
    const progress = await this.prisma.readingProgress.findMany({ where: { userId } });
    const byBook = new Map(progress.map((p) => [p.bookId, p]));
    return entries.map((e) => ({
      formatId: e.formatId,
      type: e.format.type,
      grantedAt: e.grantedAt,
      book: {
        ...e.format.book,
        authors: e.format.book.authors.map((a) => a.author.displayName),
      },
      progress: byBook.get(e.format.bookId)
        ? { percent: byBook.get(e.format.bookId)!.percent, locator: byBook.get(e.format.bookId)!.locator }
        : null,
    }));
  }

  /**
   * Issues a short-lived, single-use-intent URL. The file path is never exposed.
   * Access requires an active library entry, which is only created after payment.
   */
  async issueDeliveryUrl(userId: string, formatId: string, ip?: string) {
    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId, formatId, revokedAt: null },
      include: { format: true },
    });
    if (!entry) throw new ForbiddenException("This book is not in your library");
    if (!entry.format.isDigital || !entry.format.filePath) {
      throw new BadRequestException("This format is not a digital download");
    }

    const exp = Math.floor(Date.now() / 1000) + config.signedUrlTtlSeconds;
    const token = signPayload({ uid: userId, fmt: formatId, exp, jti: randomUUID() } satisfies DeliveryToken, config.signedUrlSecret);

    await this.prisma.downloadEvent.create({ data: { userId, formatId, ip } });
    return { url: `/api/reader/file?t=${token}`, expiresInSeconds: config.signedUrlTtlSeconds };
  }

  /** Resolves a delivery token to the private storage key. Called by the file endpoint only. */
  async resolveDelivery(token: string): Promise<{ filePath: string; isSample: boolean }> {
    const payload = verifyPayload<DeliveryToken>(token, config.signedUrlSecret);
    if (!payload) throw new ForbiddenException("Link expired or invalid");

    const entry = await this.prisma.libraryEntry.findFirst({
      where: { userId: payload.uid, formatId: payload.fmt, revokedAt: null },
      include: { format: true },
    });
    if (!entry?.format.filePath) throw new NotFoundException("File not found");
    return { filePath: entry.format.filePath, isSample: false };
  }

  async sample(formatId: string) {
    const format = await this.prisma.bookFormat.findUnique({ where: { id: formatId } });
    if (!format?.sampleFilePath) throw new NotFoundException("No sample available");
    return { filePath: format.sampleFilePath };
  }

  async saveProgress(userId: string, bookId: string, locator: string, percent: number) {
    return this.prisma.readingProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { locator, percent },
      create: { userId, bookId, locator, percent },
    });
  }

  async listBookmarks(userId: string, bookId: string) {
    return this.prisma.bookmark.findMany({ where: { userId, bookId }, orderBy: { createdAt: "asc" } });
  }

  async addBookmark(userId: string, bookId: string, locator: string, note?: string) {
    return this.prisma.bookmark.create({ data: { userId, bookId, locator, note } });
  }

  async removeBookmark(userId: string, id: string) {
    await this.prisma.bookmark.deleteMany({ where: { id, userId } });
    return { ok: true };
  }
}
