"use server";

import { listClaudeFiles } from "@/application/listClaudeFiles";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";

export async function listClaudeFilesAction(
  projectId: string,
): Promise<ClaudeFileRecord[]> {
  return listClaudeFiles(projectId, {
    claudeFiles: prismaClaudeFileRepository,
  });
}
