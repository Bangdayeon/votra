"use server";

import { unstable_cache } from "next/cache";

import { projectAiSummaryTag } from "@/app/actions/projectMetricsTag";
import {
  getCachedProjectAiSummary,
  type CachedProjectAiSummary,
} from "@/application/getCachedProjectAiSummary";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";

export async function getProjectAiSummaryAction(
  projectId: string,
): Promise<CachedProjectAiSummary> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const compute = unstable_cache(
    () =>
      getCachedProjectAiSummary(projectId, {
        aiSummaries: prismaProjectAiSummaryRepository,
      }),
    ["project-ai-summary", projectId],
    { tags: [projectAiSummaryTag(projectId)] },
  );
  return compute();
}
