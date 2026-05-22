import "server-only";

import { prisma } from "@/infrastructure/db/prisma";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export type AssertProjectMemberResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function assertProjectMember(
  projectId: string,
): Promise<AssertProjectMemberResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const [project, member] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } }),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { userId: true },
    }),
  ]);

  if (!project) return { ok: false, error: "프로젝트를 찾을 수 없어요." };
  if (project.ownerId !== user.id && !member) {
    return { ok: false, error: "권한이 없어요." };
  }
  return { ok: true, userId: user.id };
}
