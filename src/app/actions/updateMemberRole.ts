"use server";

import { updateMemberRole } from "@/application/updateMemberRole";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function updateMemberRoleAction(
  projectId: string,
  targetUserId: string,
  newRole: "OWNER" | "MEMBER",
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await updateMemberRole(
    { projectId, requesterId: guard.userId, targetUserId, newRole },
    { projects: prismaProjectRepository },
  );
  if (!result.ok) throw new Error(result.error);
}
