import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { NewBookForm } from "@/components/NewBookForm";

export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  const cookie = cookies().toString();
  let authorId: string;
  try {
    const profile = await api<{ id: string }>("/api/author/profile", { cookie });
    authorId = profile.id;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p>You need an author profile before submitting a book.</p>
          <Link href="/sell/apply" className="btn-primary mt-4">Become an author</Link>
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl">New book</h1>
      <p className="mt-2 text-sm text-ink/70 dark:text-white/70">Start with the details. You will add formats, files and a cover next.</p>
      <NewBookForm authorId={authorId} />
    </div>
  );
}
