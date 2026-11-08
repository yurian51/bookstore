import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { formatMoney, CurrencyCode } from "@/lib/format";
import { RefundButton } from "@/components/RefundButton";

export const dynamic = "force-dynamic";

interface AdminOrder {
  number: string; status: string; currency: string; totalMinor: number; createdAt: string;
  user: { email: string }; refunds: { amountMinor: number }[];
}

const REFUNDABLE = ["PAID", "FULFILLED", "SHIPPED", "DELIVERED"];

export default async function AdminOrdersPage({ searchParams }: { searchParams: { q?: string } }) {
  const cookie = cookies().toString();
  const qs = searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : "";
  let orders: AdminOrder[];
  try {
    orders = await api<AdminOrder[]>(`/api/admin/orders${qs}`, { cookie });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><p>Finance or support access required.</p><Link href="/login?next=/admin/orders" className="btn-primary mt-4">Sign in</Link></div>;
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="font-serif text-3xl">Orders and refunds</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Order number or customer email" className="flex-1 rounded border border-ink/20 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button className="btn-ghost">Search</button>
      </form>
      <ul className="space-y-4">
        {orders.map((o) => {
          const refunded = o.refunds.reduce((s, r) => s + r.amountMinor, 0);
          const remaining = o.totalMinor - refunded;
          const cur = o.currency as CurrencyCode;
          const canRefund = REFUNDABLE.includes(o.status) && remaining > 0;
          return (
            <li key={o.number} className="card space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{o.number}</span>
                <span className="capitalize text-ink/60 dark:text-white/60">{o.status.toLowerCase().replace(/_/g, " ")}</span>
              </div>
              <p className="text-ink/70 dark:text-white/70">
                {o.user.email} · {formatMoney(o.totalMinor, cur)}
                {refunded > 0 && ` · refunded ${formatMoney(refunded, cur)}`}
              </p>
              {canRefund && <RefundButton number={o.number} currency={o.currency} remainingMinor={remaining} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
