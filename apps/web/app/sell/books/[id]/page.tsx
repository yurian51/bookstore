import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { BookManager, ManagedBook } from "@/components/BookManager";

export const dynamic = "force-dynamic";

export default async function ManageBookPage({ params }: { params: { id: string } }) {
  const cookie = cookies().toString();
  let book: ManagedBook;
  try {
    book = await api<ManagedBook>(`/api/author/books/${params.id}`, { cookie });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl">{book.title}</h1>
      <BookManager initial={book} />
    </div>
  );
}
