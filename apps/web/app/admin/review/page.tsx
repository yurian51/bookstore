import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { ReviewActions } from "@/components/ReviewActions";

export const dynamic = "force-dynamic";

interface QueueBook {
  id: string;
  title: string;
  status: string;
  coverUrl: string | null;
  authors: { author: { displayName: string } }[];
  formats: { id: string; type: string; isDigital: boolean; filePath: string | null }[];
  copyrightDecls: { statement: string; acceptedAt: string }[];
}

export default async function ReviewQueuePage() {
  const cookie = cookies().toString();
  let queue: QueueBook[];
  try {
    queue = await api<QueueBook[]>("/api/admin/review-queue", { cookie });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><p>Editor or admin access required.</p><Link href="/login?next=/admin/review" className="btn-primary mt-4">Sign in</Link></div>;
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="font-serif text-3xl">Review queue</h1>
      {queue.length === 0 && <p className="text-ink/60 dark:text-white/60">Nothing waiting for review.</p>}
      <ul className="space-y-4">
        {queue.map((b) => (
          <li key={b.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{b.title}</p>
                <p className="text-sm text-ink/60 dark:text-white/60">{b.authors.map((a) => a.author.displayName).join(", ")}</p>
              </div>
              <span className="text-xs capitalize text-ink/60">{b.status.toLowerCase().replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm">
              Formats: {b.formats.map((f) => `${f.type}${f.isDigital ? (f.filePath ? " ✓file" : " (no file)") : ""}`).join(", ") || "none"}
              {" · "}Cover: {b.coverUrl ? "yes" : "missing"}
            </p>
            {b.copyrightDecls[0] && (
              <blockquote className="border-l-2 border-gold pl-3 text-sm text-ink/70 dark:text-white/70">
                Declaration: {b.copyrightDecls[0].statement}
              </blockquote>
            )}
            <ReviewActions bookId={b.id} status={b.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
