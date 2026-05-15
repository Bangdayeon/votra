import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/SignInForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { safeNextPath } from "@/shared/lib/safeNextPath";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  const user = await getCurrentUser();
  if (user) redirect(safeNext);
  return <SignInForm next={safeNext === "/" ? undefined : safeNext} />;
}
