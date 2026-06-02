import "server-only";

import type {
  FolderCreateInput,
  FolderUpdateInput,
  TaskFolderRepository,
} from "@/application/ports/taskFolderRepository";
import type { FolderRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(
  row: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    sortOrder: number;
    projectId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  },
  taskCount: number,
): FolderRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sortOrder,
    projectId: row.projectId,
    userId: row.userId,
    taskCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const prismaTaskFolderRepository: TaskFolderRepository = {
  async create({ name, projectId, userId, icon, color }: FolderCreateInput) {
    const row = await prisma.taskFolder.create({
      data: { name, projectId, userId, ...(icon !== undefined && { icon }), ...(color !== undefined && { color }) },
    });
    return toRecord(row, 0);
  },

  async update({ id, projectId, name, icon, color }: FolderUpdateInput) {
    const existing = await prisma.taskFolder.findFirst({ where: { id, projectId } });
    if (!existing) return null;
    const row = await prisma.taskFolder.update({
      where: { id },
      data: { name, ...(icon !== undefined && { icon }), ...(color !== undefined && { color }) },
    });
    const taskCount = await prisma.task.count({ where: { folderId: id } });
    return toRecord(row, taskCount);
  },

  async delete(id, projectId) {
    const existing = await prisma.taskFolder.findFirst({ where: { id, projectId } });
    if (!existing) return false;
    await prisma.taskFolder.delete({ where: { id } });
    return true;
  },

  async reorderAll(items) {
    await prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        prisma.taskFolder.update({ where: { id }, data: { sortOrder } }),
      ),
    );
  },

  async listByProject(projectId) {
    const [folders, counts] = await Promise.all([
      prisma.taskFolder.findMany({
        where: { projectId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.task.groupBy({
        by: ["folderId"],
        where: { projectId, folderId: { not: null } },
        _count: { id: true },
      }),
    ]);

    const countMap = new Map(counts.map((c) => [c.folderId, c._count.id]));
    return folders.map((f) => toRecord(f, countMap.get(f.id) ?? 0));
  },
};
