"use server";

import { listThoughts } from "@/application/listThoughts";
import type { ThoughtRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaThoughtRepository } from "@/infrastructure/repositories/prismaThoughtRepository";

export type { ThoughtRecord };

export async function getProjectThoughtsAction(
  projectId: string,
  limit = 30,
): Promise<ThoughtRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await listThoughts(
    { projectId, userId: guard.userId, limit },
    { thoughts: prismaThoughtRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
