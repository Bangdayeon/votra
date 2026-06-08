"use server";

import { listTools } from "@/application/listTools";
import type { ProjectToolRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export type { ProjectToolRecord };

export async function getToolsAction(projectId?: string): Promise<ProjectToolRecord[]> {
  if (projectId) {
    const guard = await assertProjectMember(projectId);
    if (!guard.ok) throw new Error(guard.error);
    const [projectTools, globalTools] = await Promise.all([
      prismaToolRepository.listByProject(projectId),
      prismaToolRepository.listGlobal(guard.userId),
    ]);
    const globalSlugs = new Set(globalTools.map((t) => t.slug));
    const merged = [...globalTools, ...projectTools.filter((t) => !globalSlugs.has(t.slug))];
    merged.sort((a, b) => a.folder.localeCompare(b.folder) || a.createdAt.getTime() - b.createdAt.getTime());
    return merged;
  }
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const result = await listTools(user.id, { tools: prismaToolRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
