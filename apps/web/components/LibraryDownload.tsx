import Link from "next/link";

/** Opens the in-app reader. The reader requests a signed link, so the file is never exposed directly. */
export function LibraryDownload({ formatId }: { formatId: string }) {
  return (
    <Link href={`/read/${formatId}`} className="btn-ghost inline-flex text-xs">
      Read
    </Link>
  );
}
