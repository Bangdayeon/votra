"use server";

import { addTask } from "@/application/addTask";
import type { TaskRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type { TaskRecord };

export type CreateTaskInput = {
  title: string;
  description?: string;
  tool?: string;
  priority: number;
  folderId?: string | null;
};

export async function createTaskAction(
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await addTask(
    {
      title: input.title,
      description: input.description,
      tool: input.tool,
      priority: input.priority,
      folderId: input.folderId ?? undefined,
      projectId,
      userId: guard.userId,
    },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
