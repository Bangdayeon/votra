"use server";

import {
  listClaudeFiles,
  type ListClaudeFilesResult,
} from "@/application/listClaudeFiles";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaClaudeFileEvaluationRepository } from "@/infrastructure/repositories/prismaClaudeFileEvaluationRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";

const EMPTY: ListClaudeFilesResult = {
  records: [],
  criteria: { basic: true, project: false, team: false },
};

export async function listClaudeFilesAction(
  projectId: string,
): Promise<ListClaudeFilesResult> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return EMPTY;
  return listClaudeFiles(projectId, {
    claudeFiles: prismaClaudeFileRepository,
    evaluations: prismaClaudeFileEvaluationRepository,
  });
}
