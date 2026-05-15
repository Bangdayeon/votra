"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/infrastructure/db/prisma";
import { verifyPassword } from "@/infrastructure/auth/verifyPassword";
import { setSessionCookie } from "@/infrastructure/auth/setSessionCookie";
import { safeNextPath } from "@/shared/lib/safeNextPath";

export type SignInState = { error?: string };

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next")?.toString());

  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "이메일 또는 비밀번호가 잘못됐어요." };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "이메일 또는 비밀번호가 잘못됐어요." };

  await setSessionCookie(user.id);
  redirect(next);
}
