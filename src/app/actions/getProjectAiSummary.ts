"use server";

import { getProjectAiSummary, type ProjectAiSummary } from "@/application/getProjectAiSummary";
import { getProjectMetrics } from "@/application/getProjectMetrics";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectAiSummaryAction(
  projectId: string,
): Promise<ProjectAiSummary> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const metrics = await getProjectMetrics(projectId, {
    sessions: prismaSessionRepository,
  });

  return getProjectAiSummary(metrics, { llm: geminiLlmClient });
}
