"use server";

import {
  getSessionPromptBranches,
  type PromptBranch,
} from "@/application/getSessionPromptBranches";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getSessionPromptBranchesAction(
  sessionId: string,
): Promise<PromptBranch[]> {
  return getSessionPromptBranches(sessionId, {
    sessions: prismaSessionRepository,
  });
}
