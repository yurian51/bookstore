import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService, detectKind, FORMAT_ACCEPTS, MAX_BYTES, UploadedFileLike } from "../storage/storage.service";
import { bookInputSchema } from "@gbs/shared";
import { z } from "zod";

type BookInput = z.infer<typeof bookInputSchema>;
const EDITABLE = ["DRAFT", "REJECTED", "UNPUBLISHED"];
const PAID = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"] as const;

@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("No author profile yet");
    return { id: profile.id, displayName: profile.displayName };
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

  async getBook(userId: string, bookId: string) {
    const book = await this.ownedBook(userId, bookId);
    return {
      id: book.id,
      title: book.title,
      status: book.status,
      coverUrl: book.coverUrl,
      rejectionReason: book.rejectionReason,
      formats: book.formats.map((f) => ({
        id: f.id,
        type: f.type,
        priceMinor: f.priceMinor,
        currency: f.currency,
        isDigital: f.isDigital,
        hasFile: !!f.filePath, // never expose the storage key
      })),
    };
  }

  async createBook(userId: string, input: BookInput, vendorId?: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException("Create your author profile first");
    // Authors can only credit themselves, so one author cannot attribute a book to another.
    if (!input.authorIds.every((id) => id === profile.id)) {
      throw new ForbiddenException("You can only list books you are credited on");
    }

    const base = this.slugify(input.title);
    const slug = (await this.prisma.book.findUnique({ where: { slug: base } })) ? `${base}-${Date.now().toString(36)}` : base;

    return this.prisma.book.create({
      data: {
        slug,
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
        authors: { create: [{ authorId: profile.id, position: 0 }] },
        categories: { create: input.categoryIds.map((id) => ({ categoryId: id })) },
      },
    });
  }

  async addFormat(userId: string, bookId: string, data: { type: "PHYSICAL" | "PDF" | "EPUB" | "AUDIOBOOK"; priceMinor: number; currency: string }) {
    const book = await this.ownedBook(userId, bookId);
    this.assertEditable(book.status);
    const format = await this.prisma.bookFormat.upsert({
      where: { bookId_type: { bookId, type: data.type } },
      update: { priceMinor: data.priceMinor, currency: data.currency },
      create: { bookId, type: data.type, priceMinor: data.priceMinor, currency: data.currency, isDigital: data.type !== "PHYSICAL" },
    });
    return { id: format.id, type: format.type };
  }

  async attachFile(userId: string, bookId: string, type: "PDF" | "EPUB" | "AUDIOBOOK", file: UploadedFileLike | undefined) {
    const book = await this.ownedBook(userId, bookId);
    this.assertEditable(book.status);
    const format = book.formats.find((f) => f.type === type);
    if (!format) throw new BadRequestException("Add this format before uploading its file");
    if (!file) throw new BadRequestException("No file was uploaded");
    if (file.size > MAX_BYTES[type]) throw new BadRequestException("File is too large for this format");

    const kind = detectKind(file.buffer);
    if (!kind || !FORMAT_ACCEPTS[type].includes(kind)) {
      throw new BadRequestException("The file content does not match the selected format");
    }

    const key = await this.storage.saveDigital(file.buffer, kind);
    const previous = format.filePath;
    await this.prisma.bookFormat.update({ where: { id: format.id }, data: { filePath: key } });
    if (previous) await this.storage.remove(previous);
    return { ok: true };
  }

  async attachCover(userId: string, bookId: string, file: UploadedFileLike | undefined) {
    const book = await this.ownedBook(userId, bookId);
    this.assertEditable(book.status);
    if (!file) throw new BadRequestException("No image was uploaded");
    if (file.size > MAX_BYTES.COVER) throw new BadRequestException("Cover image is too large");

    const kind = detectKind(file.buffer);
    if (kind !== "JPEG" && kind !== "PNG" && kind !== "WEBP") {
      throw new BadRequestException("Cover must be a JPEG, PNG or WebP image");
    }
    const name = await this.storage.saveCover(file.buffer, kind);
    const previous = book.coverUrl?.match(/^\/api\/covers\/([a-f0-9]{48}\.(?:jpg|png|webp))$/)?.[1];
    await this.prisma.book.update({ where: { id: bookId }, data: { coverUrl: `/api/covers/${name}` } });
    if (previous) await this.storage.removeCover(previous);
    return { coverUrl: `/api/covers/${name}` };
  }

  async submitForReview(userId: string, bookId: string, declaration: string) {
    const book = await this.ownedBook(userId, bookId);
    if (!["DRAFT", "REJECTED", "UNPUBLISHED"].includes(book.status)) {
      throw new BadRequestException("Book is already in review or published");
    }
    if (!book.coverUrl) throw new BadRequestException("Upload a cover before submitting");
    if (!book.formats.length) throw new BadRequestException("Add at least one format before submitting");
    const missing = book.formats.filter((f) => f.isDigital && !f.filePath);
    if (missing.length) {
      throw new BadRequestException(`Upload a file for: ${missing.map((f) => f.type).join(", ")}`);
    }
    if (!declaration || declaration.trim().length < 20) {
      throw new BadRequestException("A copyright declaration of at least 20 characters is required");
    }

    await this.prisma.$transaction([
      this.prisma.copyrightDeclaration.create({ data: { bookId, declaredBy: userId, statement: declaration.trim() } }),
      this.prisma.submission.create({ data: { bookId, status: "SUBMITTED" } }),
      this.prisma.book.update({ where: { id: bookId }, data: { status: "SUBMITTED", rejectionReason: null } }),
    ]);
    return { ok: true };
  }

  /** Sales are grouped by currency. Adding TZS and USD together would be meaningless. */
  async salesSummary(userId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) return { units: 0, grossByCurrency: {} as Record<string, number> };
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { status: { in: [...PAID] } },
        format: { book: { authors: { some: { authorId: profile.id } } } },
      },
      select: { quantity: true, lineTotalMinor: true, order: { select: { currency: true } } },
    });
    const grossByCurrency: Record<string, number> = {};
    for (const i of items) {
      grossByCurrency[i.order.currency] = (grossByCurrency[i.order.currency] ?? 0) + i.lineTotalMinor;
    }
    return { units: items.reduce((s, i) => s + i.quantity, 0), grossByCurrency };
  }

  private assertEditable(status: string) {
    if (!EDITABLE.includes(status)) {
      throw new BadRequestException("This book cannot be changed while it is in review or published");
    }
  }

  private async ownedBook(userId: string, bookId: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: { formats: true, authors: true, vendor: true },
    });
    if (!book) throw new NotFoundException("Book not found");
    const isAuthor = !!profile && book.authors.some((a) => a.authorId === profile.id);
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
