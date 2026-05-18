"use server";

import {
  listClaudeFiles,
  type ListClaudeFilesResult,
} from "@/application/listClaudeFiles";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaClaudeFileEvaluationRepository } from "@/infrastructure/repositories/prismaClaudeFileEvaluationRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

const EMPTY: ListClaudeFilesResult = {
  records: [],
  criteria: { basic: true, project: false, team: false },
};

export async function listClaudeFilesAction(
  projectId: string,
): Promise<ListClaudeFilesResult> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) return EMPTY;
  return listClaudeFiles(projectId, {
    claudeFiles: prismaClaudeFileRepository,
    evaluations: prismaClaudeFileEvaluationRepository,
    projects: prismaProjectRepository,
    policyRules: prismaPolicyRuleRepository,
  });
}
