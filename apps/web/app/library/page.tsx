import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { FORMAT_LABEL } from "@/lib/format";
import { LibraryDownload } from "@/components/LibraryDownload";

export const dynamic = "force-dynamic";

interface LibItem {
  formatId: string;
  type: string;
  book: { id: string; slug: string; title: string; coverUrl: string | null; authors: string[] };
  progress: { percent: number; locator: string } | null;
}

export default async function LibraryPage() {
  const cookie = cookies().toString();
  let items: LibItem[] = [];
  try {
    items = await api<LibItem[]>("/api/reader/library", { cookie });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl">Your library</h1>
          <Link href="/login?next=/library" className="btn-primary mt-6">Sign in</Link>
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-3xl">Your library</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-ink/70 dark:text-white/70">Books you buy as eBooks or audiobooks appear here. <Link href="/search?format=EPUB" className="underline">Browse eBooks</Link></p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <li key={i.formatId} className="card flex gap-4 p-4">
              <div className="h-28 w-20 shrink-0 rounded bg-gradient-to-br from-forest to-gold" />
              <div className="flex-1 space-y-1">
                <Link href={`/books/${i.book.slug}`} className="font-serif hover:underline">{i.book.title}</Link>
                <p className="text-sm text-ink/60 dark:text-white/60">{i.book.authors.join(", ")}</p>
                <p className="text-xs text-ink/50 dark:text-white/50">{FORMAT_LABEL[i.type] ?? i.type}</p>
                {i.progress && (
                  <div className="h-1.5 w-full overflow-hidden rounded bg-ink/10 dark:bg-white/10">
                    <div className="h-full bg-forest" style={{ width: `${Math.round(i.progress.percent)}%` }} />
                  </div>
                )}
                <LibraryDownload formatId={i.formatId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
