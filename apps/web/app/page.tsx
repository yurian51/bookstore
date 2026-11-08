import { api } from "@/lib/api";
import { Shelf } from "@/components/Shelf";
import { SearchBar } from "@/components/SearchBar";
import type { BookCardData } from "@/components/BookCard";

interface Home {
  featured: BookCardData[];
  newReleases: BookCardData[];
  bestsellers: BookCardData[];
  topRated: BookCardData[];
  digital: BookCardData[];
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: Home = { featured: [], newReleases: [], bestsellers: [], topRated: [], digital: [] };
  let loadError = false;
  try {
    data = await api<Home>("/api/home");
  } catch {
    loadError = true;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink/10 dark:border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">A bookstore for every country</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
            Read the world, <span className="italic text-forest dark:text-gold-soft">one book at a time</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-ink/70 dark:text-white/70">
            Print, eBooks and audiobooks from independent authors, publishers and bookshops across Africa, Europe, the Americas and Asia.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchBar />
          </div>
        </div>
      </section>

      {loadError && (
        <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-red-600">
          We could not reach the catalog right now. Please refresh in a moment.
        </p>
      )}

      <Shelf title="Featured books" books={data.featured} />
      <Shelf title="New releases" books={data.newReleases} />
      <Shelf title="Bestsellers" books={data.bestsellers} />
      <Shelf title="Top rated" books={data.topRated} />
      <Shelf title="eBooks and audiobooks" books={data.digital} />
    </>
  );
}
