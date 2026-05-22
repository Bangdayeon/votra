"use server";

import { reevaluateErrorClaudeFiles } from "@/application/reevaluateErrorClaudeFiles";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaClaudeFileEvaluationRepository } from "@/infrastructure/repositories/prismaClaudeFileEvaluationRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function reevaluateErrorClaudeFilesAction(
  projectId: string,
): Promise<void> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) return;
  await reevaluateErrorClaudeFiles(projectId, {
    claudeFiles: prismaClaudeFileRepository,
    evaluations: prismaClaudeFileEvaluationRepository,
    projects: prismaProjectRepository,
    policyRules: prismaPolicyRuleRepository,
    llm: geminiLlmClient,
  });
}
