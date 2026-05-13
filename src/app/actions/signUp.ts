"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/infrastructure/db/prisma";
import { hashPassword } from "@/infrastructure/auth/hashPassword";
import { setSessionCookie } from "@/infrastructure/auth/setSessionCookie";
import { randomProfileAppearance } from "@/domain/user/profileAppearance";

export type SignUpState = { error?: string };

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "올바른 이메일을 입력해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "이미 가입된 이메일이에요." };

  const passwordHash = await hashPassword(password);
  const { profileColor, profileImage } = randomProfileAppearance();
  const user = await prisma.user.create({
    data: { email, name, passwordHash, profileColor, profileImage },
    select: { id: true },
  });

  await setSessionCookie(user.id);
  redirect("/");
}
