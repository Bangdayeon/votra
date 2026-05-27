"use server";

import { updateTask } from "@/application/updateTask";
import type { TaskRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function moveTaskToFolderAction(
  projectId: string,
  taskSeq: number,
  folderId: string | null,
): Promise<TaskRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await updateTask(
    { seq: taskSeq, userId: guard.userId, folderId },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) throw new Error(result.error);
  emitProjectUpdate(projectId);
  return result.value;
}
