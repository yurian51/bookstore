import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { CartView } from "@/components/CartView";

export const dynamic = "force-dynamic";

interface Cart {
  currency: string;
  items: {
    id: string;
    quantity: number;
    type: string;
    priceMinor: number;
    currency: string;
    available: boolean;
    book: { slug: string; title: string; coverUrl: string | null };
  }[];
}

export default async function CartPage() {
  const cookie = cookies().toString();
  let cart: Cart | null = null;
  try {
    cart = await api<Cart>("/api/cart", { cookie });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-serif text-3xl">Your cart</h1>
          <p className="mt-3 text-ink/70 dark:text-white/70">Sign in to see your cart.</p>
          <Link href="/login?next=/cart" className="btn-primary mt-6">Sign in</Link>
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-3xl">Your cart</h1>
      <CartView initial={cart} />
    </div>
  );
}
