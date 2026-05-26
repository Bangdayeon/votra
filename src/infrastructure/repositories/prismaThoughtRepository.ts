import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ThoughtCreateInput,
  ThoughtRepository,
  ThoughtSearchInput,
  ThoughtSearchRow,
} from "@/application/ports/thoughtRepository";
import type { ThoughtRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

const DEFAULT_MIN_SIMILARITY = 0.7;

type RawThoughtRow = {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
  similarity: number;
};

export const prismaThoughtRepository: ThoughtRepository = {
  async create({ content, tags, embedding, projectId, userId }: ThoughtCreateInput) {
    // embedding을 먼저 받아온 뒤 atomic INSERT — 실패하면 row가 생기지 않음
    const id = randomUUID();
    const now = new Date();
    const vectorLiteral = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Thought" ("id","content","tags","embedding","createdAt","updatedAt","projectId","userId")
       VALUES ($1, $2, $3, $4::vector, $5, $5, $6, $7)`,
      id,
      content,
      tags,
      vectorLiteral,
      now,
      projectId,
      userId,
    );

    return { id, content, tags, createdAt: now } satisfies ThoughtRecord;
  },

  async search({ queryEmbedding, projectId, userId, limit, minSimilarity }: ThoughtSearchInput) {
    const threshold = minSimilarity ?? DEFAULT_MIN_SIMILARITY;
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;

    const rows = await prisma.$queryRawUnsafe<RawThoughtRow[]>(
      `SELECT id, content, tags, "createdAt",
              1 - (embedding <=> $1::vector) AS similarity
       FROM "Thought"
       WHERE "projectId" = $2
         AND "userId" = $3
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= $4
       ORDER BY embedding <=> $1::vector
       LIMIT $5`,
      vectorLiteral,
      projectId,
      userId,
      threshold,
      limit,
    );

    return rows.map((r) => ({ ...r, similarity: Number(r.similarity) })) as ThoughtSearchRow[];
  },

  async listRecent({ projectId, userId, limit }) {
    const rows = await prisma.thought.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, content: true, tags: true, createdAt: true },
    });
    return rows as ThoughtRecord[];
  },

  async listByTags({ projectId, userId, tags, limit }) {
    const rows = await prisma.thought.findMany({
      where: { projectId, userId, tags: { hasSome: tags } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, content: true, tags: true, createdAt: true },
    });
    return rows as ThoughtRecord[];
  },
};
