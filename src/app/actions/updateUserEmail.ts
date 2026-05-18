"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateUserEmailAction(
  rawEmail: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "이메일 형식이 올바르지 않아요." };
  }
  if (email === user.email) {
    return { ok: false, error: "지금 사용 중인 이메일이에요." };
  }

  const taken = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (taken && taken.id !== user.id) {
    return { ok: false, error: "이미 사용 중인 이메일이에요." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { email } });
  revalidatePath("/", "layout");
  return { ok: true, email };
}
