import "server-only";

import type { Prisma } from "@prisma/client";

import type { ProjectAiNextTaskRepository } from "@/application/ports/projectAiNextTaskRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaProjectAiNextTaskRepository: ProjectAiNextTaskRepository = {
  findByProject: async (projectId) => {
    const row = await prisma.projectAiNextTask.findUnique({
      where: { projectId },
    });
    if (!row) return null;
    return {
      tasks: parseTasks(row.tasks),
      refreshedAt: row.refreshedAt,
    };
  },

  upsert: async ({ projectId, tasks }) => {
    const refreshedAt = new Date();
    const tasksJson = tasks as unknown as Prisma.InputJsonValue;
    const row = await prisma.projectAiNextTask.upsert({
      where: { projectId },
      create: { projectId, tasks: tasksJson, refreshedAt },
      update: { tasks: tasksJson, refreshedAt },
    });
    return {
      tasks: parseTasks(row.tasks),
      refreshedAt: row.refreshedAt,
    };
  },
};

function parseTasks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}
