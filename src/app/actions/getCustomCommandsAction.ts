"use server";

import { listTools } from "@/application/listTools";
import type { ProjectToolRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export type { ProjectToolRecord };

export async function getToolsAction(projectId: string): Promise<ProjectToolRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await listTools(projectId, { tools: prismaToolRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
