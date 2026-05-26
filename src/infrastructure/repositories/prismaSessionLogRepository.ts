import "server-only";

import type { SessionLogCreateInput, SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { SessionLogRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaSessionLogRepository: SessionLogRepository = {
  async create({ summary, aiTool, projectId, userId }: SessionLogCreateInput) {
    const row = await prisma.sessionLog.create({
      data: { summary, aiTool, projectId, userId },
      select: { id: true, summary: true, aiTool: true, createdAt: true },
    });
    return row satisfies SessionLogRecord;
  },

  async listRecent({ projectId, userId, limit }) {
    const rows = await prisma.sessionLog.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, summary: true, aiTool: true, createdAt: true },
    });
    return rows satisfies SessionLogRecord[];
  },
};
