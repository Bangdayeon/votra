"use server";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prisma } from "@/infrastructure/db/prisma";

export async function deleteToolAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const tool = await prisma.projectTool.findUnique({ where: { id }, select: { userId: true, isBuiltIn: true } });
  if (!tool) return { ok: false, error: "툴을 찾을 수 없어요." };
  if (tool.userId !== user.id) return { ok: false, error: "권한이 없어요." };
  if (tool.isBuiltIn) return { ok: false, error: "기본 제공 툴은 삭제할 수 없어요." };

  await prismaToolRepository.deleteById(id);
  return { ok: true };
}
