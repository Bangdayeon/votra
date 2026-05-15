"use server";

import { listClaudeFiles } from "@/application/listClaudeFiles";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";

export async function listClaudeFilesAction(
  projectId: string,
): Promise<ClaudeFileRecord[]> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) return [];
  return listClaudeFiles(projectId, {
    claudeFiles: prismaClaudeFileRepository,
  });
}
