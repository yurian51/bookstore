import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { formatMoney, CurrencyCode } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Order {
  number: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  items: { id: string; quantity: number; lineTotalMinor: number; format: { type: string; book: { title: string; slug: string } } }[];
}

export default async function OrderPage({ params, searchParams }: { params: { number: string }; searchParams: { status?: string } }) {
  const cookie = cookies().toString();
  let order: Order;
  try {
    order = await api<Order>(`/api/orders/${params.number}`, { cookie });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const cur = order.currency as CurrencyCode;
  const row = (label: string, minor: number) => (
    <div className="flex justify-between text-sm"><span>{label}</span><span>{formatMoney(minor, cur)}</span></div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {searchParams.status === "success" && order.status === "PAID" && (
        <p className="mb-6 rounded-lg bg-forest/10 p-4 text-forest dark:text-gold-soft">Thank you. Your order is confirmed.</p>
      )}
      <h1 className="font-serif text-3xl">Order {order.number}</h1>
      <p className="mt-1 text-sm capitalize text-ink/60 dark:text-white/60">{order.status.replace(/_/g, " ").toLowerCase()}</p>
      <ul className="mt-6 space-y-3">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between text-sm">
            <Link href={`/books/${i.format.book.slug}`} className="hover:underline">{i.format.book.title} × {i.quantity}</Link>
            <span>{formatMoney(i.lineTotalMinor, cur)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2 border-t border-ink/10 pt-4 dark:border-white/10">
        {row("Subtotal", order.subtotalMinor)}
        {order.discountMinor > 0 && row("Discount", -order.discountMinor)}
        {order.shippingMinor > 0 && row("Shipping", order.shippingMinor)}
        {order.taxMinor > 0 && row("Tax", order.taxMinor)}
        <div className="flex justify-between pt-2 font-medium">
          <span>Total</span><span>{formatMoney(order.totalMinor, cur)}</span>
        </div>
      </div>
    </div>
  );
}
