"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CURRENCIES = ["TZS", "KES", "USD", "EUR", "GBP"] as const;

interface Address { id: string; fullName: string; line1: string; city: string; country: string; isDefault: boolean }

/**
 * Sends only the currency, coupon, and address id. The server re-prices everything,
 * so nothing a browser sends can change the amount charged.
 */
export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("TZS");
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function place() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currency,
          couponCode: coupon.trim() || undefined,
          shippingAddressId: addressId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : "Checkout failed. Please try again.");
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.push(`/orders/${data.orderNumber}?status=success`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="font-medium">Currency</h2>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20">
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-medium">Shipping address</h2>
        <p className="text-xs text-ink/60 dark:text-white/60">Required for physical books. Digital books are delivered to your library.</p>
        {addresses.length === 0 ? (
          <p className="text-sm">No saved addresses. <Link href="/account" className="underline">Add one in your account</Link> before paying for physical books.</p>
        ) : (
          <select value={addressId} onChange={(e) => setAddressId(e.target.value)} className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20">
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.fullName}, {a.line1}, {a.city}, {a.country}</option>
            ))}
          </select>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <label htmlFor="coupon" className="font-medium">Discount code</label>
        <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 uppercase dark:border-white/20" />
      </section>

      <p className="text-xs text-ink/60 dark:text-white/60">
        You will complete payment with our payment provider. Card details are never sent to or stored on this site.
      </p>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" onClick={place} disabled={busy}>
        {busy ? "Placing order…" : "Place order"}
      </button>
    </div>
  );
}
