"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_META } from "@gbs/shared";
import { apiCall } from "@/lib/client-api";

export function RefundButton({ number, currency, remainingMinor }: { number: string; currency: string; remainingMinor: number }) {
  const router = useRouter();
  const meta = CURRENCY_META[currency as keyof typeof CURRENCY_META];
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingMajor = remainingMinor / 10 ** meta.minorUnits;

  async function refund() {
    setBusy(true);
    setError(null);
    try {
      const body: { reason: string; amountMinor?: number } = { reason: reason.trim() };
      if (amount.trim()) body.amountMinor = Math.round(Number(amount) * 10 ** meta.minorUnits);
      await apiCall(`/api/admin/orders/${number}/refund`, { method: "POST", body: JSON.stringify(body) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder={`Amount (blank = all ${remainingMajor.toLocaleString()} ${currency})`}
        className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20"
      />
      <button onClick={refund} disabled={busy || reason.trim().length < 3} className="btn-ghost text-red-600">
        {busy ? "Refunding…" : "Refund"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 sm:col-span-3">{error}</p>}
    </div>
  );
}
