import { cookies } from "next/headers";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

interface Address { id: string; fullName: string; line1: string; city: string; country: string; isDefault: boolean }

export default async function CheckoutPage() {
  const cookie = cookies().toString();
  let addresses: Address[] = [];
  let signedIn = true;
  try {
    const cart = await api<{ items: { type: string }[] }>("/api/cart", { cookie });
    if (cart.items.length === 0) {
      return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p>Your cart is empty.</p><Link href="/search" className="btn-primary mt-4">Browse books</Link></div>;
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) signedIn = false;
    else throw e;
  }
  if (!signedIn) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><Link href="/login?next=/checkout" className="btn-primary">Sign in to check out</Link></div>;
  }

  try {
    addresses = await api<Address[]>("/api/account/addresses", { cookie });
  } catch {
    addresses = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl">Checkout</h1>
      <CheckoutForm addresses={addresses} />
    </div>
  );
}
