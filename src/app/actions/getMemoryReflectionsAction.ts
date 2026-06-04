"use server";

import { listMemoryReflections } from "@/application/listMemoryReflections";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";

export type { MemoryReflectionRecord };

export async function getMemoryReflectionsAction(
  projectId: string,
  limit = 10,
): Promise<MemoryReflectionRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  return listMemoryReflections(projectId, limit, { reflections: prismaMemoryReflectionRepository });
}
