"use server";

import { revalidateTag } from "next/cache";

import { projectAiNextTaskTag } from "@/app/actions/projectMetricsTag";
import {
  refreshProjectNextTasks,
  type RefreshedProjectNextTasks,
} from "@/application/refreshProjectNextTasks";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function refreshProjectNextTasksAction(
  projectId: string,
): Promise<RefreshedProjectNextTasks> {
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await refreshProjectNextTasks(projectId, {
    projects: prismaProjectRepository,
    nextTasks: prismaProjectAiNextTaskRepository,
    tasks: prismaTaskRepository,
    llm: geminiLlmClient,
  });

  revalidateTag(projectAiNextTaskTag(projectId));

  return result;
}
