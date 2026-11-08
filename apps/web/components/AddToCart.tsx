"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FORMAT_LABEL, formatMoney, CurrencyCode } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Format { id: string; type: string; currency: string; priceMinor: number; isDigital: boolean }

export function AddToCart({ bookId, bookSlug, formats }: { bookId: string; bookSlug: string; formats: Format[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(formats[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add(buyNow: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/api/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookId, formatId: selected, quantity: 1 }),
      });
      if (res.status === 401) {
        router.push(`/login?next=/books/${bookSlug}`);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(typeof body.message === "string" ? body.message : "Could not add to cart");
        return;
      }
      if (buyNow) router.push("/checkout");
      else setMessage("Added to your cart");
    } finally {
      setBusy(false);
    }
  }

  async function wishlist() {
    setMessage(null);
    const res = await fetch(`${API}/api/wishlist/${bookId}`, { method: "POST", credentials: "include" });
    if (res.status === 401) {
      router.push(`/login?next=/books/${bookSlug}`);
      return;
    }
    setMessage(res.ok ? "Saved to your wishlist" : "Could not update wishlist");
  }

  if (formats.length === 0) return <p className="text-sm text-ink/60">Not available for purchase.</p>;

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Format</legend>
        {formats.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-ink/15 px-3 py-2 text-sm has-[:checked]:border-forest has-[:checked]:ring-1 has-[:checked]:ring-forest dark:border-white/15">
            <span className="flex items-center gap-2">
              <input type="radio" name="format" value={f.id} checked={selected === f.id} onChange={() => setSelected(f.id)} />
              {FORMAT_LABEL[f.type] ?? f.type}
            </span>
            <span className="font-medium">{formatMoney(f.priceMinor, f.currency as CurrencyCode)}</span>
          </label>
        ))}
      </fieldset>
      <button className="btn-primary w-full" disabled={busy || !selected} onClick={() => add(true)}>Buy now</button>
      <button className="btn-ghost w-full" disabled={busy || !selected} onClick={() => add(false)}>Add to cart</button>
      <button className="btn-ghost w-full" disabled={busy} onClick={wishlist}>Add to wishlist</button>
      {message && <p role="status" className="text-sm text-forest dark:text-gold-soft">{message}</p>}
    </div>
  );
}
