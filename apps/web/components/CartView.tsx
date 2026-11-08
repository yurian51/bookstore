"use client";
import Link from "next/link";
import { useState } from "react";
import { formatMoney, FORMAT_LABEL, CurrencyCode } from "@/lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CURRENCIES = ["TZS", "KES", "USD", "EUR", "GBP"] as const;

interface CartItem {
  id: string;
  quantity: number;
  type: string;
  priceMinor: number;
  currency: string;
  available: boolean;
  book: { slug: string; title: string; coverUrl: string | null };
}
interface Cart { currency: string; items: CartItem[] }

export function CartView({ initial }: { initial: Cart }) {
  const [cart, setCart] = useState<Cart>(initial);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.message === "string" ? data.message : "Something went wrong");
      return;
    }
    setCart(data);
  }

  const subtotal = cart.items
    .filter((i) => i.available)
    .reduce((s, i) => s + i.priceMinor * i.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="text-ink/70 dark:text-white/70">Your cart is empty.</p>
        <Link href="/search" className="btn-primary mt-4">Browse books</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
      <ul className="divide-y divide-ink/10 dark:divide-white/10">
        {cart.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-5">
            <div className="h-24 w-16 shrink-0 rounded bg-gradient-to-br from-forest to-gold" />
            <div className="flex-1">
              <Link href={`/books/${item.book.slug}`} className="font-serif text-lg hover:underline">{item.book.title}</Link>
              <p className="text-sm text-ink/60 dark:text-white/60">{FORMAT_LABEL[item.type] ?? item.type}</p>
              {!item.available && <p className="mt-1 text-sm text-red-600">No longer available</p>}
              <div className="mt-3 flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  Qty
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={item.quantity}
                    disabled={item.type !== "PHYSICAL"}
                    onChange={(e) => call(`/api/cart/items/${item.id}`, "PATCH", { quantity: Number(e.target.value) })}
                    className="w-16 rounded border border-ink/20 bg-transparent px-2 py-1 dark:border-white/20"
                  />
                </label>
                <button onClick={() => call(`/api/cart/items/${item.id}`, "DELETE")} className="text-red-600 hover:underline">Remove</button>
              </div>
            </div>
            <p className="font-medium">{formatMoney(item.priceMinor * item.quantity, item.currency as CurrencyCode)}</p>
          </li>
        ))}
      </ul>

      <aside className="card h-fit space-y-4 p-5">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="cur">Currency</label>
          <select
            id="cur"
            value={cart.currency}
            onChange={(e) => call("/api/cart/currency", "PATCH", { currency: e.target.value })}
            className="rounded border border-ink/20 bg-transparent px-2 py-1 dark:border-white/20"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex justify-between font-medium">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal, cart.currency as CurrencyCode)}</span>
        </div>
        <p className="text-xs text-ink/60 dark:text-white/60">Tax and shipping are calculated at checkout.</p>
        <Link href="/checkout" className="btn-primary w-full">Proceed to checkout</Link>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </aside>
    </div>
  );
}
