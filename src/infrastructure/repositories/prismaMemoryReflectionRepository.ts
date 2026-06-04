import "server-only";

import type {
  CreateReflectionInput,
  MemoryReflectionRepository,
} from "@/application/ports/memoryReflectionRepository";
import type {
  MemoryReflectionRecord,
  ReflectionInsight,
  ReflectionSuggestedTask,
  SkillSuggestion,
} from "@/domain/memory/memoryTierTypes";
import { prisma } from "@/infrastructure/db/prisma";

function toRecord(row: {
  id: string;
  projectId: string;
  insights: unknown;
  suggestedTasks: unknown;
  skillSuggestions: unknown;
  contextSummary: string | null;
  analyzedTaskCount: number;
  triggerReason: string;
  createdAt: Date;
}): MemoryReflectionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    insights: (row.insights as ReflectionInsight[]) ?? [],
    suggestedTasks: (row.suggestedTasks as ReflectionSuggestedTask[]) ?? [],
    skillSuggestions: (row.skillSuggestions as SkillSuggestion[]) ?? [],
    contextSummary: row.contextSummary,
    analyzedTaskCount: row.analyzedTaskCount,
    triggerReason: row.triggerReason,
    createdAt: row.createdAt,
  };
}

export const prismaMemoryReflectionRepository: MemoryReflectionRepository = {
  async create(input: CreateReflectionInput) {
    const row = await prisma.projectMemoryReflection.create({
      data: {
        projectId: input.projectId,
        insights: input.insights,
        suggestedTasks: input.suggestedTasks,
        skillSuggestions: input.skillSuggestions,
        contextSummary: input.contextSummary,
        analyzedTaskCount: input.analyzedTaskCount,
        triggerReason: input.triggerReason,
      },
    });
    return toRecord(row);
  },

  async listByProject({ projectId, limit }) {
    const rows = await prisma.projectMemoryReflection.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  },

  async getLatest(projectId: string) {
    const row = await prisma.projectMemoryReflection.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toRecord(row) : null;
  },
};
