"use server";

import { unstable_cache } from "next/cache";

import { projectAiSummaryTag } from "@/app/actions/projectMetricsTag";
import {
  getCachedProjectAiSummary,
  type CachedProjectAiSummary,
} from "@/application/getCachedProjectAiSummary";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";

function makeCachedFetch(projectId: string) {
  return unstable_cache(
    () =>
      getCachedProjectAiSummary(projectId, {
        aiSummaries: prismaProjectAiSummaryRepository,
      }),
    ["project-ai-summary", projectId],
    { tags: [projectAiSummaryTag(projectId)] },
  );
}

export async function getProjectAiSummaryAction(
  projectId: string,
): Promise<CachedProjectAiSummary> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  return makeCachedFetch(projectId)();
}
