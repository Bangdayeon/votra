"use server";

import {
  getProjectMembers,
  type ProjectMemberRow,
} from "@/application/getProjectMembers";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type { ProjectMemberRow };

export async function getProjectMembersAction(
  projectId: string,
): Promise<{ members: ProjectMemberRow[]; currentUserId: string }> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const members = await getProjectMembers(projectId, { projects: prismaProjectRepository });
  return { members, currentUserId: guard.userId };
}
