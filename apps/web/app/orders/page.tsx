import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { formatMoney, CurrencyCode } from "@/lib/format";

export const dynamic = "force-dynamic";

interface OrderSummary { number: string; status: string; totalMinor: number; currency: string; createdAt: string }

export default async function OrdersPage() {
  const cookie = cookies().toString();
  let orders: OrderSummary[] = [];
  try {
    orders = await api<OrderSummary[]>("/api/orders", { cookie });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><Link href="/login?next=/orders" className="btn-primary">Sign in</Link></div>;
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-3xl">Your orders</h1>
      {orders.length === 0 ? (
        <p className="mt-6 text-ink/70 dark:text-white/70">No orders yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10 dark:divide-white/10">
          {orders.map((o) => (
            <li key={o.number} className="flex items-center justify-between py-4">
              <div>
                <Link href={`/orders/${o.number}`} className="font-medium hover:underline">{o.number}</Link>
                <p className="text-sm text-ink/60 dark:text-white/60">{new Date(o.createdAt).toLocaleDateString()} · {o.status.replace(/_/g, " ").toLowerCase()}</p>
              </div>
              <p className="font-medium">{formatMoney(o.totalMinor, o.currency as CurrencyCode)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
