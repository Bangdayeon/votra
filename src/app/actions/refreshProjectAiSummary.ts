"use server";

import { revalidateTag } from "next/cache";

import { projectAiNextTaskTag, projectAiSummaryTag } from "@/app/actions/projectMetricsTag";
import {
  refreshProjectAiSummary,
  type RefreshedProjectAiSummary,
} from "@/application/refreshProjectAiSummary";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { processGitClient } from "@/infrastructure/git/processGitClient";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function refreshProjectAiSummaryAction(
  projectId: string,
): Promise<RefreshedProjectAiSummary> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await refreshProjectAiSummary(projectId, {
    projects: prismaProjectRepository,
    aiSummaries: prismaProjectAiSummaryRepository,
    nextTasks: prismaProjectAiNextTaskRepository,
    tasks: prismaTaskRepository,
    llm: geminiLlmClient,
    git: processGitClient,
  });

  revalidateTag(projectAiSummaryTag(projectId));
  revalidateTag(projectAiNextTaskTag(projectId));

  return result;
}
