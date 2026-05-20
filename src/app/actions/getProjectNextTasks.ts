"use server";

import { unstable_cache } from "next/cache";

import { projectAiNextTaskTag } from "@/app/actions/projectMetricsTag";
import {
  getCachedProjectNextTasks,
  type CachedProjectNextTasks,
} from "@/application/getCachedProjectNextTasks";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";

export async function getProjectNextTasksAction(
  projectId: string,
): Promise<CachedProjectNextTasks> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const compute = unstable_cache(
    () =>
      getCachedProjectNextTasks(projectId, {
        nextTasks: prismaProjectAiNextTaskRepository,
      }),
    ["project-ai-next-task-v2", projectId],
    { tags: [projectAiNextTaskTag(projectId)] },
  );
  return compute();
}
