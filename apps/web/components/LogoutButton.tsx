"use client";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }
  return <button onClick={logout} className="btn-ghost text-sm">Sign out</button>;
}
