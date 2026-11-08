"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "@/lib/client-api";

export function UserToggle({ userId, disabled }: { userId: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await apiCall(`/api/admin/users/${userId}/disabled`, { method: "POST", body: JSON.stringify({ disabled: !disabled }) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button onClick={toggle} disabled={busy} className={disabled ? "btn-ghost text-xs" : "text-xs text-red-600 underline"}>
        {disabled ? "Re-enable" : "Disable account"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
