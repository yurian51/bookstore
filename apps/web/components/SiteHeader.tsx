import Link from "next/link";
import { SearchBar } from "./SearchBar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur dark:border-white/10 dark:bg-[#141311]/90">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-serif text-xl tracking-tight">Global Bookstore</Link>
        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/search" className="hover:text-forest">Browse</Link>
          <Link href="/library" className="hover:text-forest">Library</Link>
          <Link href="/cart" className="hover:text-forest">Cart</Link>
          <Link href="/account" className="hover:text-forest">Account</Link>
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
