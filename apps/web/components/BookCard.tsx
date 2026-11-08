import Link from "next/link";
import { formatMoney, CurrencyCode } from "@/lib/format";

export interface BookCardData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  authors: string[];
  publisher?: string | null;
  formats: { id: string; type: string; currency: string; priceMinor: number }[];
}

export function BookCard({ book }: { book: BookCardData }) {
  const lowest = [...book.formats].sort((a, b) => a.priceMinor - b.priceMinor)[0];
  return (
    <Link href={`/books/${book.slug}`} className="group block">
      <div className="book-cover flex items-end p-3 text-white" style={book.coverUrl ? { backgroundImage: `url(${book.coverUrl})`, backgroundSize: "cover" } : undefined}>
        {!book.coverUrl && <span className="font-serif text-sm leading-tight line-clamp-4">{book.title}</span>}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="font-serif text-base leading-snug line-clamp-2">{book.title}</p>
        <p className="text-sm text-ink/60 dark:text-white/60 line-clamp-1">{book.authors.join(", ")}</p>
        {lowest && (
          <p className="text-sm font-medium text-forest dark:text-gold-soft">
            from {formatMoney(lowest.priceMinor, lowest.currency as CurrencyCode)}
          </p>
        )}
      </div>
    </Link>
  );
}
