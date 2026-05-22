"use server";

import { revalidateTag } from "next/cache";

import { agentContextFlowDiagnosisTag } from "@/app/actions/projectMetricsTag";
import {
  refreshAgentContextFlowDiagnosis,
  type RefreshedAgentContextFlowDiagnosis,
} from "@/application/refreshAgentContextFlowDiagnosis";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaAgentContextFlowDiagnosisRepository } from "@/infrastructure/repositories/prismaAgentContextFlowDiagnosisRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function refreshAgentContextFlowDiagnosisAction(
  projectId: string,
): Promise<RefreshedAgentContextFlowDiagnosis> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await refreshAgentContextFlowDiagnosis(projectId, {
    sessions: prismaSessionRepository,
    projects: prismaProjectRepository,
    claudeFiles: prismaClaudeFileRepository,
    diagnoses: prismaAgentContextFlowDiagnosisRepository,
    llm: geminiLlmClient,
  });

  revalidateTag(agentContextFlowDiagnosisTag(projectId));

  return result;
}
