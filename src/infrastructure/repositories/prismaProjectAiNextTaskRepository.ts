import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  NextTask,
  ProjectAiNextTaskRepository,
} from "@/application/ports/projectAiNextTaskRepository";
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

function parseTasks(raw: unknown): NextTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isNextTask);
}

function isNextTask(v: unknown): v is NextTask {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  // backward compat: old string[] storage
  if (typeof r === "string") return false;
  return (
    typeof r.title === "string" &&
    typeof r.reason === "string" &&
    (r.priority === "high" || r.priority === "medium" || r.priority === "low") &&
    typeof r.agentCommand === "string"
  );
}
