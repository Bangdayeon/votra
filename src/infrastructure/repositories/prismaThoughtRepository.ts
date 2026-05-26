import "server-only";

import { randomUUID } from "node:crypto";

import type {
  ThoughtCreateInput,
  ThoughtRepository,
  ThoughtSearchInput,
} from "@/application/ports/thoughtRepository";
import type { ThoughtRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaThoughtRepository: ThoughtRepository = {
  async create({ content, tags, projectId, userId }: ThoughtCreateInput) {
    const id = randomUUID();
    const now = new Date();

    await prisma.thought.create({
      data: { id, content, tags, projectId, userId, createdAt: now, updatedAt: now },
    });

    return { id, content, tags, createdAt: now } satisfies ThoughtRecord;
  },

  async search({ query, projectId, userId, limit }: ThoughtSearchInput) {
    const rows = await prisma.thought.findMany({
      where: {
        projectId,
        userId,
        content: { contains: query, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, content: true, tags: true, createdAt: true },
    });
    return rows as ThoughtRecord[];
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
