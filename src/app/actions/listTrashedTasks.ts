"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prisma } from "@/infrastructure/db/prisma";
import type { TaskRecord } from "@/domain/memory/types";

const TRASH_TTL_DAYS = 12;

export async function listTrashedTasksAction(projectId: string): Promise<TaskRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const expiry = new Date();
  expiry.setDate(expiry.getDate() - TRASH_TTL_DAYS);

  await prisma.task.deleteMany({ where: { projectId, deletedAt: { lte: expiry } } });

  const rows = await prisma.task.findMany({
    where: { projectId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: {
      id: true, seq: true, projectId: true, title: true, description: true,
      status: true, module: true, priority: true, sortOrder: true, keyDecisions: true, outcome: true,
      folderId: true, createdAt: true, updatedAt: true, doneAt: true, deletedAt: true,
      user: { select: { id: true, name: true, profileImage: true, profileColor: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    projectId: r.projectId,
    userId: r.user.id,
    userName: r.user.name,
    userProfileImage: r.user.profileImage,
    userProfileColor: r.user.profileColor,
    title: r.title,
    description: r.description,
    status: r.status as TaskRecord["status"],
    module: r.module,
    priority: r.priority,
    sortOrder: r.sortOrder,
    keyDecisions: r.keyDecisions,
    outcome: r.outcome,
    folderId: r.folderId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    doneAt: r.doneAt,
    deletedAt: r.deletedAt,
  }));
}
