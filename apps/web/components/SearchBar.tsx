"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

/** Searches books, authors, ISBN and publishers via the API's /books?q= endpoint. */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function submit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <label htmlFor="site-search" className="sr-only">Search books, authors, ISBN or publishers</label>
      <input
        id="site-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search titles, authors, ISBN, publishers"
        className="w-full rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 dark:border-white/15 dark:bg-white/5"
      />
    </form>
  );
}
