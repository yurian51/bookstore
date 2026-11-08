import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { bookInputSchema } from "@gbs/shared";
import { z } from "zod";

type BookInput = z.infer<typeof bookInputSchema>;

/**
 * Authors and vendors submit books. A book enters review as SUBMITTED and
 * cannot appear in the public catalog until an editor approves and publishes it.
 */
@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService) {}

  async ensureProfile(userId: string, displayName: string) {
    return this.prisma.authorProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, displayName },
    });
  }

  async myBooks(userId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    return this.prisma.book.findMany({
      where: { authors: { some: { authorId: profile.id } } },
      include: { formats: true, submissions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createBook(userId: string, input: BookInput, vendorId?: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    const slug = this.slugify(input.title);

    const existing = await this.prisma.book.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    if (input.authorIds.length && profile && !input.authorIds.includes(profile.id)) {
      throw new ForbiddenException("You can only list books you are credited on");
    }

    return this.prisma.book.create({
      data: {
        slug: finalSlug,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        isbn: input.isbn || null,
        language: input.language,
        edition: input.edition,
        pageCount: input.pageCount,
        tableOfContents: input.tableOfContents,
        publicationDate: input.publicationDate ? new Date(input.publicationDate) : null,
        publisherId: input.publisherId,
        vendorId,
        status: "DRAFT",
        authors: { create: input.authorIds.map((id, i) => ({ authorId: id, position: i })) },
        categories: { create: input.categoryIds.map((id) => ({ categoryId: id })) },
      },
    });
  }

  async submitForReview(userId: string, bookId: string, declaration: string) {
    const book = await this.ownedBook(userId, bookId);
    if (!["DRAFT", "REJECTED", "UNPUBLISHED"].includes(book.status)) {
      throw new BadRequestException("Book is already in review or published");
    }
    if (!book.formats.length) throw new BadRequestException("Add at least one format before submitting");
    if (!declaration || declaration.length < 20) {
      throw new BadRequestException("A copyright declaration is required");
    }

    await this.prisma.$transaction([
      this.prisma.copyrightDeclaration.create({ data: { bookId, declaredBy: userId, statement: declaration } }),
      this.prisma.submission.create({ data: { bookId, status: "SUBMITTED" } }),
      this.prisma.book.update({ where: { id: bookId }, data: { status: "SUBMITTED", rejectionReason: null } }),
    ]);
    return { ok: true };
  }

  async addFormat(userId: string, bookId: string, data: { type: "PHYSICAL" | "PDF" | "EPUB" | "AUDIOBOOK"; priceMinor: number; currency: string; filePath?: string }) {
    const book = await this.ownedBook(userId, bookId);
    if (book.status === "PUBLISHED") throw new BadRequestException("Unpublish before changing formats");
    const isDigital = data.type !== "PHYSICAL";
    if (isDigital && !data.filePath) throw new BadRequestException("Digital formats need an uploaded file");
    return this.prisma.bookFormat.upsert({
      where: { bookId_type: { bookId, type: data.type } },
      update: { priceMinor: data.priceMinor, currency: data.currency, filePath: data.filePath, isDigital },
      create: { bookId, type: data.type, priceMinor: data.priceMinor, currency: data.currency, filePath: data.filePath, isDigital },
    });
  }

  /** Authors see only their own sales, aggregated, never buyer identities. */
  async salesSummary(userId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) return { units: 0, grossMinor: 0 };
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { status: { in: ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] } },
        format: { book: { authors: { some: { authorId: profile.id } } } },
      },
      select: { quantity: true, lineTotalMinor: true, currency: true },
    });
    return {
      units: items.reduce((s, i) => s + i.quantity, 0),
      grossMinor: items.reduce((s, i) => s + i.lineTotalMinor, 0),
    };
  }

  private async ownedBook(userId: string, bookId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { formats: true, authors: true, vendor: true },
    });
    if (!book) throw new NotFoundException("Book not found");
    const isAuthor = profile && book.authors.some((a) => a.authorId === profile.id);
    const isVendor = book.vendor?.userId === userId;
    if (!isAuthor && !isVendor) throw new ForbiddenException("Not your book");
    return book;
  }

  private slugify(title: string) {
    return title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "book";
  }
}
