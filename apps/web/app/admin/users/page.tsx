import Link from "next/link";
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { UserToggle } from "@/components/UserToggle";

export const dynamic = "force-dynamic";

interface AdminUser {
  id: string; email: string; name: string; country: string; createdAt: string;
  disabledAt: string | null; roles: { role: string }[];
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const cookie = cookies().toString();
  const qs = searchParams.q ? `?q=${encodeURIComponent(searchParams.q)}` : "";
  let users: AdminUser[];
  try {
    users = await api<AdminUser[]>(`/api/admin/users${qs}`, { cookie });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      return <div className="mx-auto max-w-md px-4 py-16 text-center"><p>Admin or support access required.</p><Link href="/login?next=/admin/users" className="btn-primary mt-4">Sign in</Link></div>;
    }
    throw e;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="font-serif text-3xl">Users</h1>
      <form method="get" className="flex gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Search by email or name" className="flex-1 rounded border border-ink/20 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button className="btn-ghost">Search</button>
      </form>
      <ul className="divide-y divide-ink/10 dark:divide-white/10">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium">{u.name} <span className="font-normal text-ink/60 dark:text-white/60">· {u.email}</span></p>
              <p className="text-xs text-ink/50 dark:text-white/50">
                {u.country} · joined {new Date(u.createdAt).toLocaleDateString()} · {u.roles.map((r) => r.role.toLowerCase()).join(", ")}
              </p>
            </div>
            <UserToggle userId={u.id} disabled={!!u.disabledAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}
