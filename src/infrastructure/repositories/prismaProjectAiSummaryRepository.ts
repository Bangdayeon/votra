import "server-only";

import type { Prisma } from "@prisma/client";

import type {
  ProjectAiInsightRow,
  ProjectAiSummaryRepository,
} from "@/application/ports/projectAiSummaryRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaProjectAiSummaryRepository: ProjectAiSummaryRepository = {
  findByProject: async (projectId) => {
    const row = await prisma.projectAiSummary.findUnique({
      where: { projectId },
    });
    if (!row) return null;
    return {
      summary: row.summary,
      warnings: parseInsights(row.warnings),
      suggestions: parseInsights(row.suggestions),
      refreshedAt: row.refreshedAt,
    };
  },

  upsert: async ({ projectId, summary, warnings, suggestions }) => {
    const refreshedAt = new Date();
    const warningsJson = warnings as unknown as Prisma.InputJsonValue;
    const suggestionsJson = suggestions as unknown as Prisma.InputJsonValue;
    const row = await prisma.projectAiSummary.upsert({
      where: { projectId },
      create: {
        projectId,
        summary,
        warnings: warningsJson,
        suggestions: suggestionsJson,
        refreshedAt,
      },
      update: {
        summary,
        warnings: warningsJson,
        suggestions: suggestionsJson,
        refreshedAt,
      },
    });
    return {
      summary: row.summary,
      warnings: parseInsights(row.warnings),
      suggestions: parseInsights(row.suggestions),
      refreshedAt: row.refreshedAt,
    };
  },
};

function parseInsights(raw: unknown): ProjectAiInsightRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectAiInsightRow[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : "";
    const agentCommand =
      typeof obj.agentCommand === "string" ? obj.agentCommand : "";
    if (!message && !agentCommand) continue;
    out.push({ message, agentCommand });
  }
  return out;
}
