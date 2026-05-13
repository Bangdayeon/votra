import "server-only";

import type {
  ErrorTypeCount,
  SessionMetricRow,
  SessionRepository,
} from "@/application/ports/sessionRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaSessionRepository: SessionRepository = {
  findManyByProject: async (projectId) => {
    const sessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { startedAt: "asc" },
      include: { tokenUsage: true },
    });
    return sessions.map(
      (s): SessionMetricRow => ({
        id: s.id,
        title: s.title,
        model: s.model,
        startedAt: s.startedAt,
        inputTokens: s.tokenUsage?.inputTokens ?? 0,
        outputTokens: s.tokenUsage?.outputTokens ?? 0,
      }),
    );
  },

  findErrorTypesByProject: async (projectId) => {
    const grouped = await prisma.sessionErrorFlow.groupBy({
      by: ["errorType"],
      where: { session: { projectId } },
      _count: { _all: true },
    });
    const rows: ErrorTypeCount[] = grouped.map((g) => ({
      errorType: g.errorType,
      count: g._count._all,
    }));
    rows.sort((a, b) => b.count - a.count);
    return rows;
  },
};
