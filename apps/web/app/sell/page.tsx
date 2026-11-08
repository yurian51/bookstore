import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface AuthorBook { id: string; title: string; status: string; formats: { id: string }[] }
interface Sales { units: number; grossMinor: number }

export default async function SellPage() {
  const cookie = cookies().toString();
  let books: AuthorBook[] = [];
  let sales: Sales = { units: 0, grossMinor: 0 };
  try {
    [books, sales] = await Promise.all([
      api<AuthorBook[]>("/api/author/books", { cookie }),
      api<Sales>("/api/author/sales", { cookie }),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><Link href="/login?next=/sell" className="btn-primary">Sign in to publish</Link></div>;
    }
    if (!(e instanceof ApiError && e.status === 403)) throw e;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-3xl">Become an author or seller</h1>
        <p className="mt-3 text-ink/70 dark:text-white/70">Your account needs an author or seller role. Contact the marketplace team to apply.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="flex items-end justify-between">
        <h1 className="font-serif text-3xl">Author dashboard</h1>
        <p className="text-sm text-ink/60 dark:text-white/60">Manuscript submission form: not yet built.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Books" value={books.length.toString()} />
        <Stat label="Units sold" value={sales.units.toString()} />
        <Stat label="Gross sales (minor units)" value={sales.grossMinor.toLocaleString()} />
      </div>

      <section>
        <h2 className="mb-4 font-serif text-xl">Your books</h2>
        {books.length === 0 ? (
          <p className="text-ink/60 dark:text-white/60">No books yet. Submit your first manuscript to get started.</p>
        ) : (
          <ul className="divide-y divide-ink/10 dark:divide-white/10">
            {books.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3">
                <span>{b.title}</span>
                <span className="rounded-full border border-ink/15 px-3 py-0.5 text-xs capitalize dark:border-white/15">{b.status.toLowerCase().replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-white/50">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}
