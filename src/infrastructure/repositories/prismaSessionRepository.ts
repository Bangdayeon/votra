import "server-only";

import type {
  ErrorTypeCount,
  SessionEventRow,
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
    // CLI ingest 는 ERROR 를 Event row (type=ERROR, metadata.errorType) 로만 적재해요.
    // 옛 folder-picker 경로의 SessionErrorFlow 는 더 이상 쓰이지 않아 Event 가 단일 source.
    const errorEvents = await prisma.event.findMany({
      where: { session: { projectId }, type: "ERROR" },
      select: { metadata: true },
    });
    const counts = new Map<string, number>();
    for (const e of errorEvents) {
      const type = readErrorTypeFromMetadata(e.metadata);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    const rows: ErrorTypeCount[] = [...counts.entries()].map(
      ([errorType, count]) => ({ errorType, count }),
    );
    rows.sort((a, b) => b.count - a.count);
    return rows;
  },

  findScoringRowsByProject: async (projectId) => {
    const sessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { startedAt: "asc" },
      include: {
        tokenUsage: true,
        events: {
          select: { type: true, metadata: true, timestamp: true },
          orderBy: { timestamp: "asc" },
        },
      },
    });
    return sessions.map((s): SessionScoringRow => {
      let editCount = 0;
      let messageCount = 0;
      const errorTypes: string[] = [];
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
        } else if (e.type === "ERROR") {
          errorTypes.push(readErrorTypeFromMetadata(e.metadata));
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
        errorTypes,
        editCount,
        editedFiles,
        messageCount,
      };
    });
  },

  findEventsBySession: async (sessionId) => {
    const events = await prisma.event.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
      select: {
        id: true,
        type: true,
        role: true,
        content: true,
        timestamp: true,
        metadata: true,
      },
    });
    return events.map(
      (e): SessionEventRow => ({
        id: e.id,
        type: e.type,
        role: e.role,
        content: e.content,
        timestamp: e.timestamp,
        metadata: toMetadataObject(e.metadata),
      }),
    );
  },
};

function toMetadataObject(
  metadata: unknown,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function readPathFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const path = (metadata as Record<string, unknown>).path;
  return typeof path === "string" && path.length > 0 ? path : null;
}

function readErrorTypeFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "Unknown";
  }
  const v = (metadata as Record<string, unknown>).errorType;
  return typeof v === "string" && v.length > 0 ? v : "Unknown";
}
