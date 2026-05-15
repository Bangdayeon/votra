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
  return <SignUpForm next={safeNext === "/" ? undefined : safeNext} />;
}
