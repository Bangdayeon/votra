import "server-only";

import type { SessionLogCreateInput, SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { SessionLogRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaSessionLogRepository: SessionLogRepository = {
  async save({ summary, aiTool, projectId, userId, sessionId, createOnly }: SessionLogCreateInput) {
    if (!sessionId) {
      const row = await prisma.sessionLog.create({
        data: { summary, aiTool, projectId, userId },
        select: { id: true, sessionId: true, summary: true, aiTool: true, createdAt: true, updatedAt: true },
      });
      return row satisfies SessionLogRecord;
    }

    const row = await prisma.sessionLog.upsert({
      where: { projectId_sessionId: { projectId, sessionId } },
      create: { summary, aiTool, projectId, userId, sessionId },
      update: createOnly ? {} : { summary, aiTool },
      select: { id: true, sessionId: true, summary: true, aiTool: true, createdAt: true, updatedAt: true },
    });
    return row satisfies SessionLogRecord;
  },

  async listRecent({ projectId, userId, limit }) {
    const rows = await prisma.sessionLog.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, sessionId: true, summary: true, aiTool: true, createdAt: true, updatedAt: true },
    });
    return rows satisfies SessionLogRecord[];
  },
};
