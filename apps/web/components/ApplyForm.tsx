"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/client-api";

export function ApplyForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      await apiCall("/api/account/become-author", {
        method: "POST",
        body: JSON.stringify({ displayName: data.displayName, bio: data.bio || undefined, country: data.country || undefined }),
      });
      router.push("/sell/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Display name</span>
        <input name="displayName" required minLength={2} className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Bio</span>
        <textarea name="bio" rows={4} className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Country (ISO code)</span>
        <input name="country" maxLength={2} defaultValue="TZ" className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 uppercase dark:border-white/20" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Create author profile"}</button>
    </form>
  );
}
