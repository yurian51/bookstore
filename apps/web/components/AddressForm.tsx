"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AddressForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(`${API}/api/account/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.message === "string" ? body.message : "Could not save address");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
      <h3 className="font-medium sm:col-span-2">Add an address</h3>
      <input name="fullName" required placeholder="Full name" className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      <input name="phone" placeholder="Phone (for delivery)" className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      <input name="line1" required placeholder="Street address" className="rounded border border-ink/20 bg-transparent px-3 py-2 sm:col-span-2 dark:border-white/20" />
      <input name="city" required placeholder="City" className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      <input name="region" placeholder="Region / state" className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      <input name="country" required maxLength={2} defaultValue="TZ" placeholder="Country (ISO code)" className="rounded border border-ink/20 bg-transparent px-3 py-2 uppercase dark:border-white/20" />
      <button disabled={busy} className="btn-primary sm:col-span-2">{busy ? "Saving…" : "Save address"}</button>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    </form>
  );
}
