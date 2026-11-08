import { api } from "@/lib/api";
import { BookCard, BookCardData } from "@/components/BookCard";
import { SearchBar } from "@/components/SearchBar";

interface Result { items: BookCardData[]; total: number; page: number; pageSize: number }

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; format?: string; page?: string } }) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.format) params.set("format", searchParams.format);
  if (searchParams.page) params.set("page", searchParams.page);

  let result: Result = { items: [], total: 0, page: 1, pageSize: 24 };
  let error = false;
  try {
    result = await api<Result>(`/api/books?${params.toString()}`);
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-serif text-3xl">{searchParams.q ? `Results for “${searchParams.q}”` : "All books"}</h1>
      <div className="mt-4 max-w-xl md:hidden"><SearchBar defaultValue={searchParams.q} /></div>
      <p className="mt-2 text-sm text-ink/60 dark:text-white/60">{result.total} books</p>
      {error && <p className="mt-6 text-sm text-red-600">Search is unavailable right now.</p>}
      {!error && result.items.length === 0 && (
        <p className="mt-10 text-ink/60 dark:text-white/60">No books match that search. Try an author name, ISBN, or publisher.</p>
      )}
      <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {result.items.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </div>
  );
}
