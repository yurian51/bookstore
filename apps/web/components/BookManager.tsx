"use client";
import { useState, ChangeEvent } from "react";
import { CURRENCY_META } from "@gbs/shared";
import { apiCall } from "@/lib/client-api";
import { FORMAT_LABEL } from "@/lib/format";

export interface ManagedFormat { id: string; type: string; priceMinor: number; currency: string; isDigital: boolean; hasFile: boolean }
export interface ManagedBook { id: string; title: string; status: string; coverUrl: string | null; rejectionReason: string | null; formats: ManagedFormat[] }

const CURRENCIES = ["TZS", "KES", "USD", "EUR", "GBP"] as const;
const FORMAT_TYPES = ["PDF", "EPUB", "AUDIOBOOK", "PHYSICAL"] as const;
const FILE_ACCEPT: Record<string, string> = { PDF: ".pdf", EPUB: ".epub", AUDIOBOOK: ".mp3,.m4a" };

export function BookManager({ initial }: { initial: ManagedBook }) {
  const [book, setBook] = useState(initial);
  const [type, setType] = useState<(typeof FORMAT_TYPES)[number]>("PDF");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("TZS");
  const [amount, setAmount] = useState("");
  const [declaration, setDeclaration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editable = ["DRAFT", "REJECTED", "UNPUBLISHED"].includes(book.status);

  async function run(done: string, action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setBook(await apiCall<ManagedBook>(`/api/author/books/${book.id}`));
      setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function addFormat() {
    // Prices are entered in whole units; convert to minor units using the shared currency table.
    const minor = Math.round(Number(amount) * 10 ** CURRENCY_META[currency].minorUnits);
    if (!Number.isFinite(minor) || minor <= 0) {
      setError("Enter a price greater than zero");
      return;
    }
    void run("Format saved", async () => {
      await apiCall(`/api/author/books/${book.id}/formats`, {
        method: "POST",
        body: JSON.stringify({ type, priceMinor: minor, currency }),
      });
      setAmount("");
    });
  }

  function uploadFile(formatType: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    void run("File uploaded", () =>
      apiCall(`/api/author/books/${book.id}/formats/${formatType}/file`, { method: "POST", body }),
    );
  }

  function uploadCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    void run("Cover uploaded", () => apiCall(`/api/author/books/${book.id}/cover`, { method: "POST", body }));
  }

  function submit() {
    void run("Submitted for review", () =>
      apiCall(`/api/author/books/${book.id}/submit`, { method: "POST", body: JSON.stringify({ declaration }) }),
    );
  }

  const panel = "card space-y-3 p-5";
  const input = "rounded border border-ink/20 bg-transparent px-3 py-2 text-sm dark:border-white/20";

  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm">
        Status: <span className="font-medium capitalize">{book.status.toLowerCase().replace(/_/g, " ")}</span>
      </p>
      {book.status === "REJECTED" && book.rejectionReason && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Reviewer note: {book.rejectionReason}
        </p>
      )}
      {!editable && <p className="text-sm text-ink/60 dark:text-white/60">This book is locked while it is in review or published.</p>}

      <section className={panel}>
        <h2 className="font-medium">Cover image</h2>
        {book.coverUrl && <img src={book.coverUrl} alt="Current cover" className="h-40 rounded shadow" />}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!editable || busy} onChange={uploadCover} className="text-sm" />
        <p className="text-xs text-ink/50 dark:text-white/50">JPEG, PNG or WebP, up to 5 MB.</p>
      </section>

      <section className={panel}>
        <h2 className="font-medium">Formats</h2>
        {book.formats.length === 0 && <p className="text-sm text-ink/60 dark:text-white/60">No formats yet.</p>}
        <ul className="space-y-3">
          {book.formats.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink/10 p-3 text-sm dark:border-white/10">
              <span>{FORMAT_LABEL[f.type] ?? f.type}</span>
              <span className="text-ink/70 dark:text-white/70">{(f.priceMinor / 10 ** CURRENCY_META[f.currency as keyof typeof CURRENCY_META].minorUnits).toLocaleString()} {f.currency}</span>
              {f.isDigital && (
                <span className="flex items-center gap-2">
                  {f.hasFile ? <span className="text-forest dark:text-gold-soft">File attached</span> : <span className="text-red-600">File missing</span>}
                  {editable && (
                    <input type="file" accept={FILE_ACCEPT[f.type]} disabled={busy} onChange={(e) => uploadFile(f.type, e)} className="text-xs" />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>

        {editable && (
          <div className="grid gap-3 border-t border-ink/10 pt-4 dark:border-white/10 sm:grid-cols-4">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className={input}>
              {FORMAT_TYPES.map((t) => <option key={t} value={t}>{FORMAT_LABEL[t]}</option>)}
            </select>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className={input}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Price" className={input} />
            <button onClick={addFormat} disabled={busy} className="btn-ghost">Add format</button>
          </div>
        )}
      </section>

      {editable && (
        <section className={panel}>
          <h2 className="font-medium">Submit for review</h2>
          <p className="text-xs text-ink/60 dark:text-white/60">
            Confirm that you hold the rights to publish this work and that it contains no unlicensed material.
          </p>
          <textarea value={declaration} onChange={(e) => setDeclaration(e.target.value)} rows={4} className={`${input} w-full`} placeholder="Copyright declaration (at least 20 characters)" />
          <button onClick={submit} disabled={busy || declaration.trim().length < 20} className="btn-primary">Submit for review</button>
        </section>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-forest dark:text-gold-soft">{notice}</p>}
    </div>
  );
}
