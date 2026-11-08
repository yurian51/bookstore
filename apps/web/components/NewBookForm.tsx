"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/client-api";

const LANGUAGES = ["en", "sw", "fr", "es", "ar", "pt", "zh"] as const;

/** Empty fields are dropped so optional server-side defaults and validation apply cleanly. */
export function NewBookForm({ authorId }: { authorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const raw = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const payload: Record<string, unknown> = { authorIds: [authorId], categoryIds: [] };
    for (const [k, v] of Object.entries(raw)) {
      const t = v.trim();
      if (t) payload[k] = t;
    }
    if (payload.pageCount) payload.pageCount = Number(payload.pageCount);
    try {
      const book = await apiCall<{ id: string }>("/api/author/books", { method: "POST", body: JSON.stringify(payload) });
      router.push(`/sell/books/${book.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the book");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20";
  return (
    <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Title *</span><input name="title" required className={input} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Subtitle</span><input name="subtitle" className={input} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Description</span><textarea name="description" rows={5} className={input} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium">ISBN</span><input name="isbn" placeholder="10 or 13 digits" className={input} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium">Language</span>
        <select name="language" defaultValue="en" className={input}>{LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}</select>
      </label>
      <label className="space-y-1 text-sm"><span className="font-medium">Edition</span><input name="edition" className={input} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium">Pages</span><input name="pageCount" type="number" min={1} className={input} /></label>
      <label className="space-y-1 text-sm"><span className="font-medium">Publication date</span><input name="publicationDate" type="date" className={input} /></label>
      <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Table of contents</span><textarea name="tableOfContents" rows={4} className={input} /></label>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button>
    </form>
  );
}
