import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Overview {
  users: number; authors: number; publishers: number; vendors: number;
  books: number; orders: number; revenueMinor: number;
  pendingBookApprovals: number; pendingVendorApplications: number;
}

export default async function AdminPage() {
  const cookie = cookies().toString();
  let o: Overview;
  try {
    o = await api<Overview>("/api/admin/overview", { cookie });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><p>Staff access required.</p><Link href="/login?next=/admin" className="btn-primary mt-4">Sign in</Link></div>;
    }
    throw e;
  }

  const stats: [string, string][] = [
    ["Users", o.users.toString()], ["Authors", o.authors.toString()],
    ["Publishers", o.publishers.toString()], ["Vendors", o.vendors.toString()],
    ["Books", o.books.toString()], ["Orders", o.orders.toString()],
    ["Revenue (all currencies, minor units)", o.revenueMinor.toLocaleString()],
    ["Books awaiting review", o.pendingBookApprovals.toString()],
    ["Vendor applications", o.pendingVendorApplications.toString()],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl">Administration</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/review" className="btn-primary">Review queue ({o.pendingBookApprovals})</Link>
          <Link href="/admin/orders" className="btn-ghost">Orders & refunds</Link>
          <Link href="/admin/users" className="btn-ghost">Users</Link>
        </nav>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-white/50">{label}</p>
            <p className="mt-2 font-serif text-2xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
