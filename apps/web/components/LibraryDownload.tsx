"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Requests a short-lived signed URL, then opens it. The file location is never
 * shown to the browser; the server resolves the token to the stored file.
 */
export function LibraryDownload({ formatId }: { formatId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/reader/formats/${formatId}/delivery`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not open this book right now.");
        return;
      }
      // The API returns a path that already includes the /api prefix, so it is used as-is.
      const { url } = await res.json();
      window.open(`${API}${url}`, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={open} disabled={busy} className="btn-ghost text-xs">
        {busy ? "Opening…" : "Read"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
