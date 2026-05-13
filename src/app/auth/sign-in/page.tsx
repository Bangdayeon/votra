import { redirect } from "next/navigation";

import { SignInForm } from "@/components/SignInForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <SignInForm />;
}
