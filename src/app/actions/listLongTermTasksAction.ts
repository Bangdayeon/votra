"use server";

import type { TaskRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type { TaskRecord };

export async function listLongTermTasksAction(projectId: string): Promise<TaskRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  return prismaTaskRepository.listByMemoryTier({ projectId, tier: "LONG_TERM" });
}
