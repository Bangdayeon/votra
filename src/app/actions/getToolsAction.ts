"use server";

import { seedDefaultTools } from "@/application/seedDefaultTools";
import type { ProjectToolRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export type { ProjectToolRecord };

async function resolveGlobalTools(userId: string): Promise<ProjectToolRecord[]> {
  let tools = await prismaToolRepository.listGlobal(userId);
  if (tools.length === 0) {
    await seedDefaultTools(userId, { tools: prismaToolRepository });
    tools = await prismaToolRepository.listGlobal(userId);
  }
  return tools;
}

export async function getToolsAction(projectId?: string): Promise<ProjectToolRecord[]> {
  if (projectId) {
    const guard = await assertProjectMember(projectId);
    if (!guard.ok) throw new Error(guard.error);
    const [projectTools, globalTools] = await Promise.all([
      prismaToolRepository.listByProject(projectId),
      resolveGlobalTools(guard.userId),
    ]);
    const globalSlugs = new Set(globalTools.map((t) => t.slug));
    const merged = [...globalTools, ...projectTools.filter((t) => !globalSlugs.has(t.slug))];
    merged.sort((a, b) => a.folder.localeCompare(b.folder) || a.createdAt.getTime() - b.createdAt.getTime());
    return merged;
  }
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요해요.");
  return resolveGlobalTools(user.id);
}
