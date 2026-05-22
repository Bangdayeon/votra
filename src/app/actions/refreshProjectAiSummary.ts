"use server";

import { revalidateTag } from "next/cache";

import { projectAiSummaryTag } from "@/app/actions/projectMetricsTag";
import {
  refreshProjectAiSummary,
  type RefreshedProjectAiSummary,
} from "@/application/refreshProjectAiSummary";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function refreshProjectAiSummaryAction(
  projectId: string,
): Promise<RefreshedProjectAiSummary> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await refreshProjectAiSummary(projectId, {
    sessions: prismaSessionRepository,
    projects: prismaProjectRepository,
    aiSummaries: prismaProjectAiSummaryRepository,
    llm: geminiLlmClient,
  });

  revalidateTag(projectAiSummaryTag(projectId));

  return result;
}
