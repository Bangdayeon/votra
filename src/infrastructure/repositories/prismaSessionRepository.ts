import "server-only";

import type {
  SessionEventRow,
  SessionRepository,
  SessionWithEvents,
} from "@/application/ports/sessionRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaSessionRepository: SessionRepository = {
  findRecentSessionsWithEvents: async (projectId, limit) => {
    const sessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        source: true,
        startedAt: true,
        events: {
          orderBy: { timestamp: "asc" },
          select: {
            id: true,
            type: true,
            role: true,
            content: true,
            timestamp: true,
            metadata: true,
          },
        },
      },
    });
    return sessions.map(
      (s): SessionWithEvents => ({
        id: s.id,
        title: s.title,
        source: s.source,
        startedAt: s.startedAt,
        events: s.events.map(
          (e): SessionEventRow => ({
            id: e.id,
            type: e.type,
            role: e.role,
            content: e.content,
            timestamp: e.timestamp,
            metadata: toMetadataObject(e.metadata),
          }),
        ),
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
