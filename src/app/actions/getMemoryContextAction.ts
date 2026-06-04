"use server";

import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";

export type { MemoryContextRecord };

export async function getMemoryContextAction(projectId: string): Promise<MemoryContextRecord | null> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  return prismaMemoryContextRepository.findByProject(projectId);
}
