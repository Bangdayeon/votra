"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prisma } from "@/infrastructure/db/prisma";

export async function deleteTaskAction(projectId: string, taskId: string): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  await prisma.task.deleteMany({ where: { id: taskId, projectId } });
}
