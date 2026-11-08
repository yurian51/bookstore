import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-paper-deep/60 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-lg">Global Bookstore</p>
          <p className="mt-2 text-sm text-ink/60 dark:text-white/60">Books from every country, delivered and read everywhere.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium">Shop</p>
          <ul className="space-y-1.5 text-ink/70 dark:text-white/70">
            <li><Link href="/search">All books</Link></li>
            <li><Link href="/search?format=EPUB">eBooks</Link></li>
            <li><Link href="/search?format=AUDIOBOOK">Audiobooks</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium">Publish</p>
          <ul className="space-y-1.5 text-ink/70 dark:text-white/70">
            <li><Link href="/sell">Authors and publishers</Link></li>
            <li><Link href="/sell">Sell as a vendor</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-medium">Preferences</p>
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-ink/10 px-4 py-4 text-center text-xs text-ink/50 dark:border-white/10 dark:text-white/50">
        © {new Date().getFullYear()} Global Bookstore
      </div>
    </footer>
  );
}
