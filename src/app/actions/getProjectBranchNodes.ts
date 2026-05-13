"use server";

import {
  getProjectBranchNodes,
  type BranchNode,
} from "@/application/getProjectBranchNodes";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectBranchNodesAction(
  projectId: string,
): Promise<BranchNode[]> {
  return getProjectBranchNodes(projectId, {
    sessions: prismaSessionRepository,
  });
}
