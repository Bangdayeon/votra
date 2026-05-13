import "server-only";

import type {
  ErrorTypeCount,
  SessionMetricRow,
  SessionRepository,
  SessionScoringRow,
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

  findScoringRowsByProject: async (projectId) => {
    const sessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { startedAt: "asc" },
      include: {
        tokenUsage: true,
        errorFlows: { select: { errorType: true } },
        events: {
          select: { type: true, metadata: true, timestamp: true },
          orderBy: { timestamp: "asc" },
        },
      },
    });
    return sessions.map((s): SessionScoringRow => {
      let editCount = 0;
      let messageCount = 0;
      const editedFiles: string[] = [];
      const seenPaths = new Set<string>();
      for (const e of s.events) {
        if (e.type === "FILE_EDIT") {
          editCount++;
          const path = readPathFromMetadata(e.metadata);
          if (path && !seenPaths.has(path)) {
            seenPaths.add(path);
            editedFiles.push(path);
          }
        } else if (e.type === "PROMPT" || e.type === "ASSISTANT") {
          messageCount++;
        }
      }
      return {
        id: s.id,
        title: s.title,
        model: s.model,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        totalTokens: s.tokenUsage?.totalTokens ?? 0,
        retryCount: s.tokenUsage?.retryCount ?? 0,
        errorTypes: s.errorFlows.map((e) => e.errorType),
        editCount,
        editedFiles,
        messageCount,
      };
    });
  },
};

function readPathFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const path = (metadata as Record<string, unknown>).path;
  return typeof path === "string" && path.length > 0 ? path : null;
}
