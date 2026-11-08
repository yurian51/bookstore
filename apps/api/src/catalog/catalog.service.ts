import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface BookListQuery {
  q?: string;
  category?: string;
  language?: string;
  format?: "PHYSICAL" | "PDF" | "EPUB" | "AUDIOBOOK";
  sort?: "newest" | "title" | "rating";
  page?: number;
  pageSize?: number;
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  /** Only published books are visible to the public. */
  private publicWhere() {
    return { status: "PUBLISHED" as const };
  }

  async listBooks(query: BookListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, query.pageSize ?? 24));
    const where: any = { ...this.publicWhere() };

    if (query.q) {
      const term = query.q.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { subtitle: { contains: term, mode: "insensitive" } },
        { isbn: { equals: term.replace(/-/g, "") } },
        { authors: { some: { author: { displayName: { contains: term, mode: "insensitive" } } } } },
        { publisher: { name: { contains: term, mode: "insensitive" } } },
      ];
    }
    if (query.category) where.categories = { some: { category: { slug: query.category } } };
    if (query.language) where.language = query.language;
    if (query.format) where.formats = { some: { type: query.format } };

    const orderBy =
      query.sort === "title" ? { title: "asc" as const } : { publishedAt: "desc" as const };

    const [items, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.cardInclude(),
      }),
      this.prisma.book.count({ where }),
    ]);

    return { items: items.map((b) => this.toCard(b)), total, page, pageSize };
  }

  async getBookBySlug(slug: string) {
    const book = await this.prisma.book.findFirst({
      where: { slug, ...this.publicWhere() },
      include: {
        authors: { include: { author: true }, orderBy: { position: "asc" } },
        categories: { include: { category: true } },
        formats: { orderBy: { type: "asc" } },
        publisher: true,
        reviews: { where: { status: "PUBLISHED" }, take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
        relatedFrom: { take: 8, include: { to: { include: this.cardInclude() } } },
      },
    });
    if (!book) throw new NotFoundException("Book not found");

    const ratings = await this.prisma.review.aggregate({
      where: { bookId: book.id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      id: book.id,
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      isbn: book.isbn,
      language: book.language,
      publicationDate: book.publicationDate,
      edition: book.edition,
      pageCount: book.pageCount,
      tableOfContents: book.tableOfContents,
      coverUrl: book.coverUrl,
      publisher: book.publisher ? { id: book.publisher.id, name: book.publisher.name } : null,
      authors: book.authors.map((a) => ({
        id: a.author.id,
        displayName: a.author.displayName,
        bio: a.author.bio,
        country: a.author.country,
      })),
      categories: book.categories.map((c) => ({ id: c.category.id, slug: c.category.slug, name: c.category.name })),
      formats: book.formats.map((f) => ({
        id: f.id,
        type: f.type,
        currency: f.currency,
        priceMinor: f.priceMinor,
        isDigital: f.isDigital,
        hasSample: !!f.sampleFilePath,
      })),
      rating: { average: ratings._avg.rating ?? 0, count: ratings._count.rating },
      reviews: book.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        author: r.user.name,
        createdAt: r.createdAt,
      })),
      related: book.relatedFrom.map((r) => this.toCard(r.to)),
    };
  }

  async getAuthor(id: string) {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id },
      include: {
        books: {
          include: { book: { include: this.cardInclude() } },
        },
      },
    });
    if (!author) throw new NotFoundException("Author not found");
    return {
      id: author.id,
      displayName: author.displayName,
      bio: author.bio,
      country: author.country,
      website: author.website,
      photoUrl: author.photoUrl,
      verified: author.verified,
      books: author.books
        .filter((b) => b.book.status === "PUBLISHED")
        .map((b) => this.toCard(b.book)),
    };
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: true },
    });
    return categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        children: c.children.map((ch) => ({ id: ch.id, slug: ch.slug, name: ch.name })),
      }));
  }

  /** Homepage sections. Each is a real query, not hardcoded content. */
  async homepage() {
    const [featured, newReleases, bestsellers, topRated, eBooks] = await Promise.all([
      this.prisma.book.findMany({ where: { ...this.publicWhere(), featured: true }, take: 12, include: this.cardInclude() }),
      this.prisma.book.findMany({ where: this.publicWhere(), orderBy: { publishedAt: "desc" }, take: 12, include: this.cardInclude() }),
      this.prisma.orderItem.groupBy({
        by: ["formatId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 12,
      }).then(async (rows) => {
        const formats = await this.prisma.bookFormat.findMany({
          where: { id: { in: rows.map((r) => r.formatId) } },
          include: { book: { include: this.cardInclude() } },
        });
        return formats.map((f) => f.book).filter((b) => b.status === "PUBLISHED");
      }),
      this.prisma.book.findMany({
        where: this.publicWhere(),
        take: 12,
        include: { ...this.cardInclude(), reviews: { select: { rating: true } } },
      }).then((books) =>
        books
          .map((b) => ({ b, avg: b.reviews.length ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length : 0 }))
          .sort((x, y) => y.avg - x.avg)
          .map((x) => x.b),
      ),
      this.prisma.book.findMany({
        where: { ...this.publicWhere(), formats: { some: { type: { in: ["PDF", "EPUB", "AUDIOBOOK"] } } } },
        take: 12,
        include: this.cardInclude(),
      }),
    ]);

    return {
      featured: featured.map((b) => this.toCard(b)),
      newReleases: newReleases.map((b) => this.toCard(b)),
      bestsellers: bestsellers.map((b) => this.toCard(b)),
      topRated: topRated.map((b) => this.toCard(b)),
      digital: eBooks.map((b) => this.toCard(b)),
    };
  }

  private cardInclude() {
    return {
      authors: { include: { author: true }, orderBy: { position: "asc" as const }, take: 3 },
      formats: { select: { id: true, type: true, currency: true, priceMinor: true } },
      publisher: { select: { id: true, name: true } },
    };
  }

  private toCard(b: any) {
    return {
      id: b.id,
      slug: b.slug,
      title: b.title,
      subtitle: b.subtitle,
      coverUrl: b.coverUrl,
      language: b.language,
      authors: (b.authors ?? []).map((a: any) => a.author.displayName),
      publisher: b.publisher?.name ?? null,
      formats: (b.formats ?? []).map((f: any) => ({ id: f.id, type: f.type, currency: f.currency, priceMinor: f.priceMinor })),
    };
  }
}
