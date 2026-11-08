"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.message === "string" ? data.message : "Something went wrong. Check your details and try again.");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {mode === "register" && (
        <Field name="name" label="Full name" autoComplete="name" required />
      )}
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
      {mode === "register" && (
        <input type="hidden" name="country" value="TZ" />
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      <p className="text-center text-sm">
        {mode === "login" ? (
          <>New here? <Link href="/register" className="underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}

function Field({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} className="w-full rounded border border-ink/20 bg-transparent px-3 py-2 dark:border-white/20" {...rest} />
    </label>
  );
}
