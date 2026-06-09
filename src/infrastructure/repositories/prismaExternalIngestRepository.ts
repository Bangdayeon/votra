import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  CreateExternalIngestInput,
  ExternalIngestRecord,
  ExternalIngestRepository,
} from "@/application/ports/externalIngestRepository";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  projectId: string;
  source: string;
  content: string;
  contentHash: string;
  sourceUrl: string | null;
  metadata: unknown;
  processedAt: Date | null;
  createdAt: Date;
}): ExternalIngestRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    source: row.source,
    content: row.content,
    contentHash: row.contentHash,
    sourceUrl: row.sourceUrl,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    processedAt: row.processedAt,
    createdAt: row.createdAt,
  };
}

export const prismaExternalIngestRepository: ExternalIngestRepository = {
  async upsert(input: CreateExternalIngestInput) {
    let duplicate = false;
    const existing = await prisma.externalIngest.findUnique({
      where: { projectId_contentHash: { projectId: input.projectId, contentHash: input.contentHash } },
    });
    if (existing) {
      duplicate = true;
      return { record: toRecord(existing), duplicate };
    }
    const row = await prisma.externalIngest.create({
      data: {
        projectId: input.projectId,
        source: input.source,
        content: input.content,
        contentHash: input.contentHash,
        sourceUrl: input.sourceUrl ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return { record: toRecord(row), duplicate };
  },

  async listUnprocessed({ projectId, limit }) {
    const rows = await prisma.externalIngest.findMany({
      where: { projectId, processedAt: null },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map(toRecord);
  },

  async markProcessed(ids: string[]) {
    if (ids.length === 0) return;
    await prisma.externalIngest.updateMany({
      where: { id: { in: ids } },
      data: { processedAt: new Date() },
    });
  },
};
