import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";

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
    ["Revenue (TZS minor units)", formatMoney(o.revenueMinor, "TZS")],
    ["Books awaiting review", o.pendingBookApprovals.toString()],
    ["Vendor applications", o.pendingVendorApplications.toString()],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <h1 className="font-serif text-3xl">Administration</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs uppercase tracking-wide text-ink/50 dark:text-white/50">{label}</p>
            <p className="mt-2 font-serif text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink/60 dark:text-white/60">
        Review queue, commission reports and user management are available through the API routes under <code>/api/admin</code>.
      </p>
    </div>
  );
}
