import "server-only";

import { prisma } from "@/infrastructure/db/prisma";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export type AssertOwnedProjectResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function assertOwnedProject(
  projectId: string,
): Promise<AssertOwnedProjectResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project || project.ownerId !== user.id) {
    return { ok: false, error: "권한이 없어요." };
  }
  return { ok: true, userId: user.id };
}
