"use server";

import {
  getProjectBranchNodes,
  type BranchNode,
} from "@/application/getProjectBranchNodes";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectBranchNodesAction(
  projectId: string,
): Promise<BranchNode[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  return getProjectBranchNodes(projectId, {
    sessions: prismaSessionRepository,
  });
}
