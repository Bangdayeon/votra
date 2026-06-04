"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prisma } from "@/infrastructure/db/prisma";
import type { TaskRecord } from "@/domain/memory/types";

const TRASH_TTL_DAYS = 12;

const SELECT = {
  id: true, seq: true, projectId: true, title: true, description: true,
  status: true, module: true, priority: true, sortOrder: true, keyDecisions: true, outcome: true,
  folderId: true, createdAt: true, updatedAt: true, doneAt: true, deletedAt: true,
  memoryTier: true, accessCount: true, lastAccessedAt: true, isPinned: true,
  user: { select: { id: true, name: true, profileImage: true, profileColor: true } },
} as const;

function toRecord(r: {
  id: string; seq: number; projectId: string; title: string; description: string | null;
  status: string; module: string | null; priority: number; sortOrder: number; keyDecisions: string[];
  outcome: string | null; folderId: string | null; createdAt: Date; updatedAt: Date;
  doneAt: Date | null; deletedAt: Date | null; memoryTier: string; accessCount: number;
  lastAccessedAt: Date | null; isPinned: boolean;
  user: { id: string; name: string | null; profileImage: string | null; profileColor: string | null };
}): TaskRecord {
  return {
    id: r.id, seq: r.seq, projectId: r.projectId,
    userId: r.user.id, userName: r.user.name,
    userProfileImage: r.user.profileImage, userProfileColor: r.user.profileColor,
    title: r.title, description: r.description,
    status: r.status as TaskRecord["status"],
    module: r.module, priority: r.priority, sortOrder: r.sortOrder,
    keyDecisions: r.keyDecisions, outcome: r.outcome, folderId: r.folderId,
    memoryTier: r.memoryTier as TaskRecord["memoryTier"],
    accessCount: r.accessCount, lastAccessedAt: r.lastAccessedAt, isPinned: r.isPinned,
    createdAt: r.createdAt, updatedAt: r.updatedAt, doneAt: r.doneAt, deletedAt: r.deletedAt,
  };
}

async function purgeExpired(projectId: string) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() - TRASH_TTL_DAYS);
  await prisma.task.deleteMany({ where: { projectId, deletedAt: { lte: expiry } } });
}

export async function listTrashedTasksAction(projectId: string): Promise<TaskRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  await purgeExpired(projectId);

  const rows = await prisma.task.findMany({
    where: { projectId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: SELECT,
  });

  return rows.map(toRecord);
}

export async function listTrashedTasksPageAction(
  projectId: string,
  page: number,
  pageSize = 20,
  search?: string,
): Promise<{ tasks: TaskRecord[]; total: number }> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  await purgeExpired(projectId);

  const where = {
    projectId,
    deletedAt: { not: null },
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { deletedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SELECT,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks: rows.map(toRecord), total };
}
