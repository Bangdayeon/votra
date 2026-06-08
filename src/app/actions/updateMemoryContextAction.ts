"use server";

import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";

export type UpdateMemoryContextInput = {
  projectId: string;
  serviceDescription: string;
  techStack: string;
  targetUsers: string;
  currentGoal: string;
};

export type UpdateMemoryContextResult =
  | { ok: true; record: MemoryContextRecord }
  | { ok: false; error: string };

export async function updateMemoryContextAction(
  input: UpdateMemoryContextInput,
): Promise<UpdateMemoryContextResult> {
  const guard = await assertProjectMember(input.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  try {
    const record = await prismaMemoryContextRepository.upsert({
      projectId: input.projectId,
      serviceDescription: input.serviceDescription,
      techStack: input.techStack,
      targetUsers: input.targetUsers,
      currentGoal: input.currentGoal,
    });
    return { ok: true, record };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "저장 실패" };
  }
}
