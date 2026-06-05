import "server-only";

import type {
  DecayCandidate,
  TaskCreateInput,
  TaskListFilter,
  TaskRepository,
  TaskUpdateInput,
} from "@/application/ports/taskRepository";
import type { MemoryTierValue, TaskRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

const SELECT = {
  id: true, seq: true, projectId: true, title: true, description: true,
  status: true, tool: true, priority: true, sortOrder: true, keyDecisions: true, outcome: true,
  folderId: true, createdAt: true, updatedAt: true, doneAt: true, deletedAt: true,
  memoryTier: true, accessCount: true, lastAccessedAt: true, isPinned: true,
  user: { select: { id: true, name: true, profileImage: true, profileColor: true } },
} as const;

function toRecord(row: {
  id: string;
  seq: number;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  tool: string | null;
  priority: number;
  sortOrder: number;
  keyDecisions: string[];
  outcome: string | null;
  folderId: string | null;
  memoryTier: string;
  accessCount: number;
  lastAccessedAt: Date | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
  deletedAt: Date | null;
  user: { id: string; name: string | null; profileImage: string | null; profileColor: string | null };
}): TaskRecord {
  return {
    id: row.id,
    seq: row.seq,
    projectId: row.projectId,
    userId: row.user.id,
    userName: row.user.name,
    userProfileImage: row.user.profileImage,
    userProfileColor: row.user.profileColor,
    title: row.title,
    description: row.description,
    status: row.status as TaskRecord["status"],
    tool: row.tool,
    priority: row.priority,
    sortOrder: row.sortOrder,
    keyDecisions: row.keyDecisions,
    outcome: row.outcome,
    folderId: row.folderId,
    memoryTier: row.memoryTier as TaskRecord["memoryTier"],
    accessCount: row.accessCount,
    lastAccessedAt: row.lastAccessedAt,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doneAt: row.doneAt,
    deletedAt: row.deletedAt,
  };
}

export const prismaTaskRepository: TaskRepository = {
  async create({ title, description, tool, priority, folderId, projectId, userId }: TaskCreateInput) {
    const row = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        tool: tool ?? null,
        priority: priority ?? 0,
        folderId: folderId ?? null,
        projectId,
        userId,
      },
      select: SELECT,
    });
    return toRecord(row);
  },

  async update({ seq, userId, title, description, status, tool, priority, folderId, keyDecisions, outcome }: TaskUpdateInput) {
    const existing = await prisma.task.findFirst({ where: { seq, userId } });
    if (!existing) return null;

    const isDone = status === "DONE" || status === "CANCELLED";
    const row = await prisma.task.update({
      where: { seq },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(tool !== undefined && { tool }),
        ...(priority !== undefined && { priority }),
        ...(folderId !== undefined && { folderId }),
        ...(keyDecisions !== undefined && { keyDecisions }),
        ...(outcome !== undefined && { outcome }),
        ...(isDone && existing.doneAt === null && { doneAt: new Date() }),
      },
      select: SELECT,
    });
    return toRecord(row);
  },

  async findBySeq({ seq, projectId }: { seq: number; projectId: string }) {
    const row = await prisma.task.findFirst({ where: { seq, projectId, deletedAt: null }, select: SELECT });
    return row ? toRecord(row) : null;
  },

  async listByFilter({ projectId, userId, status, tool, limit, offset }: TaskListFilter) {
    const rows = await prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(userId !== undefined && { userId }),
        ...(status !== undefined && { status }),
        ...(tool !== undefined && { tool }),
      },
      orderBy: [{ priority: "desc" }, { seq: "asc" }],
      ...(limit !== undefined && { take: limit }),
      ...(offset !== undefined && { skip: offset }),
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async findRecentDone({ projectId, userId, limit }) {
    const rows = await prisma.task.findMany({
      where: {
        projectId,
        userId,
        deletedAt: null,
        status: { in: ["DONE", "CANCELLED"] },
      },
      orderBy: { doneAt: "desc" },
      take: limit,
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async findRecentByUpdatedAt({ projectId, userId, limit }) {
    const rows = await prisma.task.findMany({
      where: { projectId, deletedAt: null, ...(userId ? { userId } : {}) },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async trackAccess(taskId: string) {
    await prisma.task.update({
      where: { id: taskId },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    });
  },

  async batchUpdateMemoryTier(updates: Array<{ id: string; tier: MemoryTierValue }>) {
    await prisma.$transaction(
      updates.map(({ id, tier }) =>
        prisma.task.update({ where: { id }, data: { memoryTier: tier } }),
      ),
    );
  },

  async updateMemoryTier({ taskId, tier, isPinned }: { taskId: string; tier: MemoryTierValue; isPinned?: boolean }) {
    await prisma.task.update({
      where: { id: taskId },
      data: { memoryTier: tier, ...(isPinned !== undefined && { isPinned }) },
    });
  },

  async listForDecay(projectId: string): Promise<DecayCandidate[]> {
    return prisma.task.findMany({
      where: { projectId },
      select: {
        id: true, isPinned: true, accessCount: true, priority: true,
        lastAccessedAt: true, doneAt: true, createdAt: true, deletedAt: true, memoryTier: true,
      },
    }) as Promise<DecayCandidate[]>;
  },

  async listByMemoryTier({ projectId, tier, limit }: { projectId: string; tier: MemoryTierValue; limit?: number }) {
    const rows = await prisma.task.findMany({
      where: { projectId, memoryTier: tier, deletedAt: null },
      orderBy: [{ priority: "desc" }, { seq: "asc" }],
      ...(limit !== undefined && { take: limit }),
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async countActivitySince({ projectId, sinceDate }: { projectId: string; sinceDate: Date }) {
    return prisma.task.count({
      where: {
        projectId,
        deletedAt: null,
        updatedAt: { gte: sinceDate },
        status: { in: ["DONE", "CANCELLED"] },
      },
    });
  },

  async search({ query, projectId, userId, limit }) {
    type RawRow = {
      id: string; seq: number; projectId: string; title: string; description: string | null;
      status: string; tool: string | null; priority: number; sortOrder: number; keyDecisions: string[];
      outcome: string | null; folderId: string | null; createdAt: Date; updatedAt: Date; doneAt: Date | null;
      deletedAt: Date | null; memoryTier: string; accessCount: number; lastAccessedAt: Date | null; isPinned: boolean;
      userId: string; userName: string | null; userProfileImage: string | null; userProfileColor: string | null;
    };
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT t.id, t.seq, t."projectId", t.title, t.description, t.status, t.tool, t.priority, t."sortOrder",
             t."keyDecisions", t.outcome, t."folderId", t."createdAt", t."updatedAt", t."doneAt", t."deletedAt",
             t."memoryTier", t."accessCount", t."lastAccessedAt", t."isPinned",
             t."userId", u.name AS "userName", u."profileImage" AS "userProfileImage", u."profileColor" AS "userProfileColor"
      FROM "Task" t
      LEFT JOIN "User" u ON u.id = t."userId"
      WHERE t."projectId" = ${projectId}
        AND t."userId" = ${userId}
        AND t."deletedAt" IS NULL
        AND (
          t.title ILIKE ${'%' + query + '%'}
          OR t.description ILIKE ${'%' + query + '%'}
          OR EXISTS (SELECT 1 FROM unnest(t."keyDecisions") kd WHERE kd ILIKE ${'%' + query + '%'})
        )
      ORDER BY t."doneAt" DESC NULLS LAST, t."createdAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => toRecord({
      ...r,
      sortOrder: Number(r.sortOrder),
      folderId: r.folderId ?? null,
      deletedAt: r.deletedAt ?? null,
      memoryTier: r.memoryTier,
      accessCount: Number(r.accessCount),
      lastAccessedAt: r.lastAccessedAt ?? null,
      isPinned: Boolean(r.isPinned),
      user: { id: r.userId, name: r.userName, profileImage: r.userProfileImage, profileColor: r.userProfileColor },
    }));
  },
};
