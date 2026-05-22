"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/infrastructure/auth/clearSessionCookie";

export async function signOutForInviteAction(token: string): Promise<void> {
  await clearSessionCookie();
  redirect(`/auth/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
}
