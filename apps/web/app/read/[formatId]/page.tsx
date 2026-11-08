import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { Reader } from "@/components/Reader";

export const dynamic = "force-dynamic";

interface LibItem {
  formatId: string;
  type: string;
  book: { id: string; slug: string; title: string };
  progress: { percent: number; locator: string } | null;
}

/** Only books in the signed-in user's library can be opened. The API enforces this again on file delivery. */
export default async function ReadPage({ params }: { params: { formatId: string } }) {
  const cookie = cookies().toString();
  let items: LibItem[];
  try {
    items = await api<LibItem[]>("/api/reader/library", { cookie });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/login?next=/read/${params.formatId}`);
    throw e;
  }
  const item = items.find((i) => i.formatId === params.formatId);
  if (!item) notFound();

  return (
    <Reader
      formatId={item.formatId}
      type={item.type}
      bookId={item.book.id}
      bookSlug={item.book.slug}
      title={item.book.title}
      progress={item.progress}
    />
  );
}
