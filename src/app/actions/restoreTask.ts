"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prisma } from "@/infrastructure/db/prisma";

export async function restoreTaskAction(projectId: string, taskId: string): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  await prisma.task.updateMany({ where: { id: taskId, projectId }, data: { deletedAt: null } });
}
