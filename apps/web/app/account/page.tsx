import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { AddressForm } from "@/components/AddressForm";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

interface Me { user: { id: string; name: string; email: string; country: string; roles: string[] } | null }
interface Address { id: string; fullName: string; line1: string; city: string; country: string; isDefault: boolean }

export default async function AccountPage() {
  const cookie = cookies().toString();
  let me: Me = { user: null };
  let addresses: Address[] = [];
  try {
    me = await api<Me>("/api/auth/me", { cookie });
    if (me.user) addresses = await api<Address[]>("/api/account/addresses", { cookie });
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }

  if (!me.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-serif text-3xl">Your account</h1>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login?next=/account" className="btn-primary">Sign in</Link>
          <Link href="/register" className="btn-ghost">Create account</Link>
        </div>
      </div>
    );
  }

  const isSeller = me.user.roles.some((r) => ["AUTHOR", "PUBLISHER", "VENDOR"].includes(r));
  const isStaff = me.user.roles.some((r) => ["ADMIN", "EDITOR", "SUPPORT", "FINANCE"].includes(r));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl">Hello, {me.user.name}</h1>
          <p className="text-sm text-ink/60 dark:text-white/60">{me.user.email}</p>
        </div>
        <LogoutButton />
      </header>

      <nav className="grid gap-4 sm:grid-cols-3">
        <Link href="/library" className="card p-5 hover:border-forest">Library</Link>
        <Link href="/orders" className="card p-5 hover:border-forest">Orders</Link>
        <Link href="/cart" className="card p-5 hover:border-forest">Cart</Link>
        {isSeller && <Link href="/sell" className="card p-5 hover:border-forest">Seller dashboard</Link>}
        {isStaff && <Link href="/admin" className="card p-5 hover:border-forest">Admin</Link>}
      </nav>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">Delivery addresses</h2>
        {addresses.length === 0 && <p className="text-sm text-ink/60">No addresses saved yet.</p>}
        <ul className="space-y-2 text-sm">
          {addresses.map((a) => (
            <li key={a.id} className="card p-4">{a.fullName}, {a.line1}, {a.city}, {a.country}{a.isDefault && " · default"}</li>
          ))}
        </ul>
        <AddressForm />
      </section>
    </div>
  );
}
