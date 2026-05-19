"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/infrastructure/auth/clearSessionCookie";

export async function switchCliAccountAction(formData: FormData): Promise<void> {
  const callback = formData.get("callback") as string;
  const state = formData.get("state") as string;
  await clearSessionCookie();
  const next = `/cli/signin?callback=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}`;
  redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
}
