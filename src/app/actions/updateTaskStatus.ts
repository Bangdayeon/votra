"use server";

import { updateTask } from "@/application/updateTask";
import type { TaskRecord, TaskStatusValue } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function updateTaskStatusAction(
  projectId: string,
  taskSeq: number,
  status: TaskStatusValue,
): Promise<TaskRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await updateTask(
    { seq: taskSeq, userId: guard.userId, status },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
