"use server";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";
import { prisma } from "@/infrastructure/db/prisma";

export async function deleteCommandAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const command = await prisma.projectCommand.findUnique({ where: { id }, select: { userId: true, isBuiltIn: true } });
  if (!command) return { ok: false, error: "커맨드를 찾을 수 없어요." };
  if (command.userId !== user.id) return { ok: false, error: "권한이 없어요." };
  if (command.isBuiltIn) return { ok: false, error: "기본 제공 커맨드는 삭제할 수 없어요." };

  await prismaCommandRepository.deleteById(id);
  return { ok: true };
}
