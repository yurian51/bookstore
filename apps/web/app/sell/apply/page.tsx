import { ApplyForm } from "@/components/ApplyForm";

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Become an author</h1>
      <p className="mt-2 text-sm text-ink/70 dark:text-white/70">Tell readers who you are. You can submit books once your profile is saved.</p>
      <ApplyForm />
    </div>
  );
}
