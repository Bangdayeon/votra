"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

/**
 * 계정 초기화: 계정 자체는 유지하되 소유 프로젝트(+세션·이벤트·CLI 키)와
 * 사용자 레벨 정책/프로필 커스터마이즈를 모두 비워요.
 */
export async function resetAccountAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  await prisma.$transaction([
    prisma.project.deleteMany({ where: { ownerId: user.id } }),
    prisma.apiKey.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        profileColor: null,
        profileImage: null,
      },
    }),
  ]);

  revalidatePath("/", "layout");
  return { ok: true };
}
