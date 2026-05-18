"use server";

import { unstable_cache } from "next/cache";

import { projectMetricsTag } from "@/app/actions/projectMetricsTag";
import {
  getProjectMetrics,
  type ProjectMetrics,
} from "@/application/getProjectMetrics";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectMetricsAction(
  projectId: string,
): Promise<ProjectMetrics> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const compute = unstable_cache(
    () => getProjectMetrics(projectId, { sessions: prismaSessionRepository }),
    ["project-metrics", projectId],
    { tags: [projectMetricsTag(projectId)] },
  );
  return compute();
}
