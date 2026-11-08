const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Browser-side API call. Sends the session cookie; leaves multipart boundaries to the browser. */
export async function apiCall<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageOf(data));
  return data as T;
}

function messageOf(data: any): string {
  const m = data?.message;
  if (typeof m === "string") return m;
  if (Array.isArray(m)) return m.join(", ");
  if (m && typeof m === "object") return Object.values(m).flat().join(", ");
  return "Request failed";
}
