import "server-only";

import type {
  TaskCreateInput,
  TaskListFilter,
  TaskRepository,
  TaskUpdateInput,
} from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

const SELECT = {
  id: true, seq: true, projectId: true, title: true, description: true,
  status: true, module: true, priority: true, keyDecisions: true, outcome: true,
  createdAt: true, updatedAt: true, doneAt: true,
  user: { select: { id: true, name: true } },
} as const;

function toRecord(row: {
  id: string;
  seq: number;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  module: string | null;
  priority: number;
  keyDecisions: string[];
  outcome: string | null;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
  user: { id: string; name: string | null };
}): TaskRecord {
  return {
    id: row.id,
    seq: row.seq,
    projectId: row.projectId,
    userId: row.user.id,
    userName: row.user.name,
    title: row.title,
    description: row.description,
    status: row.status as TaskRecord["status"],
    module: row.module,
    priority: row.priority,
    keyDecisions: row.keyDecisions,
    outcome: row.outcome,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doneAt: row.doneAt,
  };
}

export const prismaTaskRepository: TaskRepository = {
  async create({ title, description, module, priority, projectId, userId }: TaskCreateInput) {
    const row = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        module: module ?? null,
        priority: priority ?? 0,
        projectId,
        userId,
      },
      select: SELECT,
    });
    return toRecord(row);
  },

  async update({ seq, userId, title, description, status, module, priority, keyDecisions, outcome }: TaskUpdateInput) {
    const existing = await prisma.task.findFirst({ where: { seq, userId } });
    if (!existing) return null;

    const isDone = status === "DONE" || status === "CANCELLED";
    const row = await prisma.task.update({
      where: { seq },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(module !== undefined && { module }),
        ...(priority !== undefined && { priority }),
        ...(keyDecisions !== undefined && { keyDecisions }),
        ...(outcome !== undefined && { outcome }),
        ...(isDone && existing.doneAt === null && { doneAt: new Date() }),
      },
      select: SELECT,
    });
    return toRecord(row);
  },

  async listByFilter({ projectId, userId, status, module }: TaskListFilter) {
    const rows = await prisma.task.findMany({
      where: {
        projectId,
        ...(userId !== undefined && { userId }),
        ...(status !== undefined && { status }),
        ...(module !== undefined && { module }),
      },
      orderBy: [{ priority: "desc" }, { seq: "asc" }],
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async findRecentDone({ projectId, userId, limit }) {
    const rows = await prisma.task.findMany({
      where: {
        projectId,
        userId,
        status: { in: ["DONE", "CANCELLED"] },
      },
      orderBy: { doneAt: "desc" },
      take: limit,
      select: SELECT,
    });
    return rows.map(toRecord);
  },

  async search({ query, projectId, userId, limit }) {
    type RawRow = {
      id: string; seq: number; projectId: string; title: string; description: string | null;
      status: string; module: string | null; priority: number; keyDecisions: string[];
      outcome: string | null; createdAt: Date; updatedAt: Date; doneAt: Date | null;
      userId: string; userName: string | null;
    };
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT t.id, t.seq, t."projectId", t.title, t.description, t.status, t.module, t.priority,
             t."keyDecisions", t.outcome, t."createdAt", t."updatedAt", t."doneAt",
             t."userId", u.name AS "userName"
      FROM "Task" t
      LEFT JOIN "User" u ON u.id = t."userId"
      WHERE t."projectId" = ${projectId}
        AND t."userId" = ${userId}
        AND (
          t.title ILIKE ${'%' + query + '%'}
          OR t.description ILIKE ${'%' + query + '%'}
          OR EXISTS (SELECT 1 FROM unnest(t."keyDecisions") kd WHERE kd ILIKE ${'%' + query + '%'})
        )
      ORDER BY t."doneAt" DESC NULLS LAST, t."createdAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => toRecord({ ...r, user: { id: r.userId, name: r.userName } }));
  },
};
