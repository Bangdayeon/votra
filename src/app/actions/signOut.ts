"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/infrastructure/auth/session";

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/auth/sign-in");
}
