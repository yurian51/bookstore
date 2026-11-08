import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatMoney, FORMAT_LABEL, CurrencyCode } from "@/lib/format";
import { AddToCart } from "@/components/AddToCart";
import { Shelf } from "@/components/Shelf";
import type { BookCardData } from "@/components/BookCard";

interface BookDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  isbn: string | null;
  language: string;
  publicationDate: string | null;
  edition: string | null;
  pageCount: number | null;
  tableOfContents: string | null;
  coverUrl: string | null;
  publisher: { id: string; name: string } | null;
  authors: { id: string; displayName: string; bio: string | null; country: string | null }[];
  categories: { id: string; slug: string; name: string }[];
  formats: { id: string; type: string; currency: string; priceMinor: number; isDigital: boolean; hasSample: boolean }[];
  rating: { average: number; count: number };
  reviews: { id: string; rating: number; title: string | null; body: string | null; author: string; createdAt: string }[];
  related: BookCardData[];
}

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: { slug: string } }) {
  let book: BookDetail;
  try {
    book = await api<BookDetail>(`/api/books/${params.slug}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        <div>
          <div className="book-cover flex items-end p-4 text-white" style={book.coverUrl ? { backgroundImage: `url(${book.coverUrl})`, backgroundSize: "cover" } : undefined}>
            {!book.coverUrl && <span className="font-serif text-lg leading-tight">{book.title}</span>}
          </div>
          <div className="mt-6">
            <AddToCart bookId={book.id} bookSlug={book.slug} formats={book.formats} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-4xl leading-tight">{book.title}</h1>
            {book.subtitle && <p className="mt-1 text-lg text-ink/70 dark:text-white/70">{book.subtitle}</p>}
            <p className="mt-3 text-ink/80 dark:text-white/80">
              by {book.authors.map((a) => a.displayName).join(", ")}
            </p>
            <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
              {book.rating.count > 0 ? `★ ${book.rating.average.toFixed(1)} (${book.rating.count} ratings)` : "No ratings yet"}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-ink/10 p-5 text-sm dark:border-white/10 sm:grid-cols-3">
            <Detail label="Publisher" value={book.publisher?.name} />
            <Detail label="Publication date" value={book.publicationDate ? new Date(book.publicationDate).toLocaleDateString() : null} />
            <Detail label="Language" value={book.language} />
            <Detail label="Edition" value={book.edition} />
            <Detail label="Pages" value={book.pageCount?.toString() ?? null} />
            <Detail label="ISBN" value={book.isbn} />
          </dl>

          <div className="flex flex-wrap gap-2 text-sm">
            {book.formats.map((f) => (
              <span key={f.id} className="rounded-full border border-ink/15 px-3 py-1 dark:border-white/15">
                {FORMAT_LABEL[f.type] ?? f.type} · {formatMoney(f.priceMinor, f.currency as CurrencyCode)}
              </span>
            ))}
          </div>

          {book.description && (
            <section>
              <h2 className="mb-2 font-serif text-xl">About this book</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink/80 dark:text-white/80">{book.description}</p>
            </section>
          )}

          {book.tableOfContents && (
            <section>
              <h2 className="mb-2 font-serif text-xl">Table of contents</h2>
              <p className="whitespace-pre-line text-sm text-ink/80 dark:text-white/80">{book.tableOfContents}</p>
            </section>
          )}

          {book.authors.map((a) => a.bio && (
            <section key={a.id} className="card p-5">
              <h2 className="font-serif text-lg">{a.displayName}</h2>
              <p className="mt-2 text-sm text-ink/70 dark:text-white/70">{a.bio}</p>
            </section>
          ))}

          {book.reviews.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-xl">Reader reviews</h2>
              <ul className="space-y-4">
                {book.reviews.map((r) => (
                  <li key={r.id} className="card p-4">
                    <p className="text-sm">★ {r.rating} · {r.author}</p>
                    {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                    {r.body && <p className="mt-1 text-sm text-ink/70 dark:text-white/70">{r.body}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <Shelf title="Related books" books={book.related} />
    </article>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-ink/50 dark:text-white/50">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
