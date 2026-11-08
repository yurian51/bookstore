import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/redirect";

const ERRORS: Record<string, string> = {
  google: "Google sign-in did not complete. Please try again.",
  unverified: "Your Google email address is not verified.",
  link_required: "This email already has a password account. Sign in with your password instead.",
  disabled: "This account has been disabled. Contact support.",
};

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Sign in</h1>
      {searchParams.error && ERRORS[searchParams.error] && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {ERRORS[searchParams.error]}
        </p>
      )}
      <AuthForm mode="login" next={safeNext(searchParams.next)} />
    </div>
  );
}
