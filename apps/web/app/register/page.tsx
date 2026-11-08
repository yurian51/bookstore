import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Create your account</h1>
      <AuthForm mode="register" next="/account" />
    </div>
  );
}
