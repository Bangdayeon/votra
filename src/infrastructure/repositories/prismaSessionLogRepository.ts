import "server-only";

import type { CreateSessionLogInput, SessionLogRecord, SessionLogRepository } from "@/application/ports/sessionLogRepository";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  projectId: string;
  userId: string;
  summary: string;
  aiTool: string;
  sessionId: string | null;
  createdAt: Date;
}): SessionLogRecord {
  return { ...row };
}

export const prismaSessionLogRepository: SessionLogRepository = {
  async upsertOrCreate(input: CreateSessionLogInput) {
    if (input.sessionId) {
      await prisma.sessionLog.upsert({
        where: { projectId_sessionId: { projectId: input.projectId, sessionId: input.sessionId } },
        create: {
          projectId: input.projectId,
          userId: input.userId,
          summary: input.summary,
          aiTool: input.aiTool,
          sessionId: input.sessionId,
        },
        update: { summary: input.summary, aiTool: input.aiTool },
      });
    } else {
      await prisma.sessionLog.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          summary: input.summary,
          aiTool: input.aiTool,
        },
      });
    }
  },

  async listByProject(projectId: string, limit: number) {
    const rows = await prisma.sessionLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  },

  async deleteOld(before: Date) {
    const { count } = await prisma.sessionLog.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return count;
  },
};
