import { BookCard, BookCardData } from "./BookCard";

export function Shelf({ title, books, id }: { title: string; books: BookCardData[]; id?: string }) {
  if (books.length === 0) return null;
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {books.map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </section>
  );
}
