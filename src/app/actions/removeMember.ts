"use server";

import { removeMember } from "@/application/removeMember";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function removeMemberAction(
  projectId: string,
  targetUserId: string,
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await removeMember(
    { projectId, requesterId: guard.userId, targetUserId },
    { projects: prismaProjectRepository },
  );
  if (!result.ok) throw new Error(result.error);
}
