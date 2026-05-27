"use server";

import { listTasks } from "@/application/listTasks";
import type { TaskRecord, TaskStatusValue } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type { TaskRecord, TaskStatusValue };

export async function getProjectTasksAction(
  projectId: string,
  status?: TaskStatusValue,
): Promise<TaskRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await listTasks(
    { projectId, status },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
