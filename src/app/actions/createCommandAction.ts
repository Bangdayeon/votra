"use server";

import { createCommand } from "@/application/createCommand";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";

export async function createCommandAction(
  projectId: string,
  input: { name: string; description: string; folder: string; content: string },
): Promise<Result<ProjectCommandRecord, string>> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return { ok: false, error: guard.error };
  return createCommand(
    { projectId, ...input },
    { commands: prismaCommandRepository },
  );
}
