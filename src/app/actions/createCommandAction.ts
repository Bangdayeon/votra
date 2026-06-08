"use server";

import { createTool } from "@/application/createTool";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";

export async function createCommandAction(
  projectId: string,
  input: { name: string; description: string; folder: string; content: string },
): Promise<Result<ProjectToolRecord, string>> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return { ok: false, error: guard.error };
  return createTool(
    { projectId, isBuiltIn: false, ...input },
    { tools: prismaToolRepository },
  );
}
