import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/SignUpForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { safeNextPath } from "@/shared/lib/safeNextPath";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  const user = await getCurrentUser();
  if (user) redirect(safeNext);
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-sm">
        <SignUpForm next={safeNext === "/" ? undefined : safeNext} />
      </div>
    </div>
  );
}
