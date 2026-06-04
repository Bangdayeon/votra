import "server-only";

import type { MemoryContextRecord, MemoryContextRepository } from "@/application/ports/memoryContextRepository";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  projectId: string;
  content: string;
  version: number;
  updatedAt: Date;
}): MemoryContextRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    content: row.content,
    version: row.version,
    updatedAt: row.updatedAt,
  };
}

export const prismaMemoryContextRepository: MemoryContextRepository = {
  async findByProject(projectId) {
    const row = await prisma.projectMemoryContext.findUnique({ where: { projectId } });
    return row ? toRecord(row) : null;
  },

  async upsert({ projectId, content }) {
    const existing = await prisma.projectMemoryContext.findUnique({
      where: { projectId },
      select: { version: true },
    });
    const row = await prisma.projectMemoryContext.upsert({
      where: { projectId },
      create: { projectId, content, version: 1 },
      update: { content, version: (existing?.version ?? 0) + 1 },
    });
    return toRecord(row);
  },
};
