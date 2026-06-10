import { prisma } from "@/infrastructure/db/prisma";

export async function assertApiKeyProjectAccess(
  userId: string,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [project, member] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } }),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true },
    }),
  ]);
  if (!project) return { ok: false, error: "프로젝트를 찾을 수 없어요." };
  if (project.ownerId !== userId && !member) return { ok: false, error: "권한이 없어요." };
  return { ok: true };
}
