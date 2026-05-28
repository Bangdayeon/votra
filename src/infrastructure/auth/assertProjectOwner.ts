import "server-only";

import { prisma } from "@/infrastructure/db/prisma";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export type AssertProjectOwnerResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function assertProjectOwner(
  projectId: string,
): Promise<AssertProjectOwnerResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const [member, project] = await Promise.all([
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      select: { role: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    }),
  ]);

  const isOwner = member?.role === "OWNER" || project?.ownerId === user.id;
  if (!isOwner) {
    return { ok: false, error: "권한이 없어요." };
  }
  return { ok: true, userId: user.id };
}
