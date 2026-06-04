"use server";

import { pinTask } from "@/application/pinTask";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function pinTaskAction(
  projectId: string,
  taskId: string,
  isPinned: boolean,
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  await pinTask(taskId, isPinned, { tasks: prismaTaskRepository });
}
