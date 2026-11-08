import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/redirect";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Sign in</h1>
      <AuthForm mode="login" next={safeNext(searchParams.next)} />
    </div>
  );
}
