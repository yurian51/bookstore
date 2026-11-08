"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Props {
  formatId: string;
  type: string;
  bookId: string;
  bookSlug: string;
  title: string;
  progress: { percent: number; locator: string } | null;
}
interface Bookmark { id: string; locator: string; note: string | null }

/**
 * Reads a purchased file. Each file is fetched through a short-lived signed link,
 * so it is never addressable by a public URL. Progress syncs at most every 5 seconds.
 */
export function Reader({ formatId, type, bookId, bookSlug, title, progress }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fontPct, setFontPct] = useState(100);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const hostRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSave = useRef(0);
  const latest = useRef({ locator: progress?.locator ?? "", percent: progress?.percent ?? 0 });

  function save(locator: string, percent: number, force = false) {
    latest.current = { locator, percent };
    const now = Date.now();
    if (!force && now - lastSave.current < 5000) return;
    lastSave.current = now;
    fetch(`${API}/api/reader/progress`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        locator: (locator || "start").slice(0, 500),
        percent: Math.min(100, Math.max(0, percent)),
      }),
    }).catch(() => undefined);
  }

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const res = await fetch(`${API}/api/reader/formats/${formatId}/delivery`, { method: "POST", credentials: "include" });
        if (!res.ok) throw new Error("This book could not be opened.");
        const { url } = await res.json();
        const fileRes = await fetch(`${API}${url}`);
        if (!fileRes.ok) throw new Error("The file could not be downloaded.");
        const buf = await fileRes.arrayBuffer();
        if (cancelled) return;

        if (type === "PDF") {
          setPdfUrl(URL.createObjectURL(new Blob([buf], { type: "application/pdf" })));
          setStatus("ready");
        } else if (type === "EPUB") {
          const mod: any = await import("epubjs");
          const ePub = mod.default ?? mod;
          const book = ePub(buf);
          const rendition = book.renderTo(hostRef.current!, { width: "100%", height: "72vh", flow: "paginated" });
          renditionRef.current = rendition;
          rendition.themes.fontSize(`${fontPct}%`);
          rendition.on("relocated", (loc: any) => {
            const cfi = loc.start.cfi as string;
            const ready = book.locations.length() > 0;
            const pct = ready ? book.locations.percentageFromCfi(cfi) * 100 : latest.current.percent;
            save(cfi, pct);
          });
          const start = progress?.locator && progress.locator !== "start" ? progress.locator : undefined;
          await rendition.display(start);
          setStatus("ready");
          // Location generation is slow, so it runs in the background and only improves the percentage.
          book.ready.then(() => book.locations.generate(1600)).catch(() => undefined);
          cleanup = () => book.destroy();
        } else {
          setAudioUrl(URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" })));
          setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "This book could not be opened.");
          setStatus("error");
        }
      }
    })();

    fetch(`${API}/api/reader/books/${bookId}/bookmarks`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Bookmark[]) => !cancelled && setBookmarks(list))
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cleanup?.();
      save(latest.current.locator, latest.current.percent, true);
    };
    // Reader is keyed by formatId in the route, so this runs once per book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatId, type]);

  // Audio: track playback time and resume from the saved position.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    const onLoaded = () => {
      const t = Number(progress?.locator);
      if (!Number.isNaN(t) && t > 0) a.currentTime = t;
    };
    const onTime = () => {
      if (a.duration) save(String(a.currentTime), (a.currentTime / a.duration) * 100);
    };
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  function changeFont(delta: number) {
    const next = Math.min(160, Math.max(70, fontPct + delta));
    setFontPct(next);
    renditionRef.current?.themes.fontSize(`${next}%`);
  }

  async function addBookmark() {
    const res = await fetch(`${API}/api/reader/books/${bookId}/bookmarks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locator: latest.current.locator || "start" }),
    });
    if (res.ok) setBookmarks((b) => [...b, await res.json()]);
  }

  function jumpTo(locator: string) {
    if (type === "EPUB") renditionRef.current?.display(locator);
    if (type === "AUDIOBOOK" && audioRef.current) audioRef.current.currentTime = Number(locator) || 0;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/books/${bookSlug}`} className="font-serif text-lg hover:underline">{title}</Link>
        <div className="flex gap-2 text-sm">
          {type === "EPUB" && (
            <>
              <button className="btn-ghost text-xs" onClick={() => changeFont(-10)} aria-label="Smaller text">A−</button>
              <button className="btn-ghost text-xs" onClick={() => changeFont(10)} aria-label="Larger text">A+</button>
            </>
          )}
          {(type === "EPUB" || type === "AUDIOBOOK") && (
            <button className="btn-ghost text-xs" onClick={addBookmark}>Bookmark</button>
          )}
        </div>
      </div>

      {status === "loading" && <p className="text-sm text-ink/60 dark:text-white/60">Opening…</p>}
      {status === "error" && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {type === "PDF" && pdfUrl && <iframe title={title} src={pdfUrl} className="h-[80vh] w-full rounded border border-ink/10" />}
      {type === "EPUB" && <div ref={hostRef} className="min-h-[72vh] rounded border border-ink/10 bg-white p-2 text-black" />}
      {type === "AUDIOBOOK" && audioUrl && <audio ref={audioRef} controls src={audioUrl} className="w-full" />}

      {bookmarks.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-medium">Bookmarks</h2>
          <ul className="space-y-1 text-sm">
            {bookmarks.map((b) => (
              <li key={b.id}>
                <button className="underline" onClick={() => jumpTo(b.locator)}>
                  {type === "AUDIOBOOK" ? `At ${Math.floor(Number(b.locator) / 60)} min` : "Saved place"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
