"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/client-api";

export function ReviewActions({ bookId, status }: { bookId: string; status: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REJECT" | "PUBLISH" | "UNPUBLISH") {
    setBusy(true);
    setError(null);
    try {
      await apiCall(`/api/admin/books/${bookId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const inReview = status === "SUBMITTED" || status === "IN_REVIEW";
  const approved = status === "APPROVED";
  const published = status === "PUBLISHED";

  return (
    <div className="space-y-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required to reject)"
        className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />
      <div className="flex flex-wrap gap-2">
        {inReview && <button className="btn-primary" disabled={busy} onClick={() => decide("APPROVE")}>Approve</button>}
        {approved && <button className="btn-primary" disabled={busy} onClick={() => decide("PUBLISH")}>Publish</button>}
        {published && <button className="btn-ghost" disabled={busy} onClick={() => decide("UNPUBLISH")}>Unpublish</button>}
        {(inReview || approved) && <button className="btn-ghost" disabled={busy || !reason.trim()} onClick={() => decide("REJECT")}>Reject</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
