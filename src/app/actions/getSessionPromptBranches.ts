"use server";

import {
  getSessionPromptBranches,
  type PromptBranch,
} from "@/application/getSessionPromptBranches";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getSessionPromptBranchesAction(
  sessionId: string,
): Promise<PromptBranch[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { project: { select: { ownerId: true } } },
  });
  if (!session || session.project.ownerId !== user.id) return [];
  return getSessionPromptBranches(sessionId, {
    sessions: prismaSessionRepository,
  });
}
