const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Calls the API with the session cookie. Server components pass the cookie
 * header explicitly; client components rely on the browser sending it.
 */
export async function api<T>(path: string, init: RequestInit & { cookie?: string } = {}): Promise<T> {
  const { cookie, ...rest } = init;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(rest.headers as Record<string, string>) };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.message === "string" ? body.message : Object.values(body.message ?? {}).flat().join(", ") || message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
