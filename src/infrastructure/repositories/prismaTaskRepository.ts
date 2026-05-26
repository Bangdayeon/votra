import "server-only";

import type {
  TaskCreateInput,
  TaskListFilter,
  TaskRepository,
  TaskUpdateInput,
} from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  seq: number;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  module: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
}): TaskRecord {
  return {
    id: row.id,
    seq: row.seq,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as TaskRecord["status"],
    module: row.module,
    priority: row.priority,
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
      select: {
        id: true, seq: true, projectId: true, title: true, description: true,
        status: true, module: true, priority: true, createdAt: true, updatedAt: true, doneAt: true,
      },
    });
    return toRecord(row);
  },

  async update({ seq, userId, title, description, status, module, priority }: TaskUpdateInput) {
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
        ...(isDone && existing.doneAt === null && { doneAt: new Date() }),
      },
      select: {
        id: true, seq: true, projectId: true, title: true, description: true,
        status: true, module: true, priority: true, createdAt: true, updatedAt: true, doneAt: true,
      },
    });
    return toRecord(row);
  },

  async listByFilter({ projectId, userId, status, module }: TaskListFilter) {
    const rows = await prisma.task.findMany({
      where: {
        projectId,
        userId,
        ...(status !== undefined && { status }),
        ...(module !== undefined && { module }),
      },
      orderBy: [{ priority: "desc" }, { seq: "asc" }],
      select: {
        id: true, seq: true, projectId: true, title: true, description: true,
        status: true, module: true, priority: true, createdAt: true, updatedAt: true, doneAt: true,
      },
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
      select: {
        id: true, seq: true, projectId: true, title: true, description: true,
        status: true, module: true, priority: true, createdAt: true, updatedAt: true, doneAt: true,
      },
    });
    return rows.map(toRecord);
  },
};
