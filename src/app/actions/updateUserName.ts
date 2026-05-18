"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

const NAME_MIN = 2;
const NAME_MAX = 32;
const NAME_RE = /^[\p{L}\p{N}_.\- ]+$/u;

export async function updateUserNameAction(
  rawName: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (name.length < NAME_MIN) {
    return { ok: false, error: `유저네임은 ${NAME_MIN}자 이상이어야 해요.` };
  }
  if (name.length > NAME_MAX) {
    return { ok: false, error: `유저네임은 ${NAME_MAX}자 이하여야 해요.` };
  }
  if (!NAME_RE.test(name)) {
    return {
      ok: false,
      error: "유저네임에 사용할 수 없는 문자가 들어 있어요.",
    };
  }
  if (name === user.name) {
    return { ok: false, error: "지금 사용 중인 유저네임이에요." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: true, name };
}
