import "server-only";

import type { MemoryContextRecord, MemoryContextRepository } from "@/application/ports/memoryContextRepository";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  projectId: string;
  content: string;
  version: number;
  updatedAt: Date;
  serviceDescription: string | null;
  techStack: string | null;
  targetUsers: string | null;
  currentGoal: string | null;
}): MemoryContextRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    content: row.content,
    version: row.version,
    updatedAt: row.updatedAt,
    serviceDescription: row.serviceDescription,
    techStack: row.techStack,
    targetUsers: row.targetUsers,
    currentGoal: row.currentGoal,
  };
}

export const prismaMemoryContextRepository: MemoryContextRepository = {
  async findByProject(projectId) {
    const row = await prisma.projectMemoryContext.findUnique({ where: { projectId } });
    return row ? toRecord(row) : null;
  },

  async upsert({ projectId, content, serviceDescription, techStack, targetUsers, currentGoal }) {
    const existing = await prisma.projectMemoryContext.findUnique({
      where: { projectId },
      select: { version: true },
    });
    const row = await prisma.projectMemoryContext.upsert({
      where: { projectId },
      create: {
        projectId,
        content: content ?? "",
        version: 1,
        serviceDescription: serviceDescription ?? null,
        techStack: techStack ?? null,
        targetUsers: targetUsers ?? null,
        currentGoal: currentGoal ?? null,
      },
      update: {
        ...(content !== undefined && { content }),
        version: (existing?.version ?? 0) + 1,
        ...(serviceDescription !== undefined && { serviceDescription }),
        ...(techStack !== undefined && { techStack }),
        ...(targetUsers !== undefined && { targetUsers }),
        ...(currentGoal !== undefined && { currentGoal }),
      },
    });
    return toRecord(row);
  },
};
