import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/SignUpForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return <SignUpForm />;
}
