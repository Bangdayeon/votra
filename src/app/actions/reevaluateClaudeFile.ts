"use server";

import { reevaluateClaudeFile } from "@/application/reevaluateClaudeFile";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaClaudeFileEvaluationRepository } from "@/infrastructure/repositories/prismaClaudeFileEvaluationRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function reevaluateClaudeFileAction(
  projectId: string,
  absPath: string,
): Promise<void> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) return;
  await reevaluateClaudeFile(projectId, absPath, {
    claudeFiles: prismaClaudeFileRepository,
    evaluations: prismaClaudeFileEvaluationRepository,
    projects: prismaProjectRepository,
    policyRules: prismaPolicyRuleRepository,
    llm: geminiLlmClient,
  });
}
