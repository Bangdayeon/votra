import type { NextTask, ProjectAiNextTaskRepository } from "@/application/ports/projectAiNextTaskRepository";
import type {
  ProjectAiInsightRow,
  ProjectAiSummaryRepository,
} from "@/application/ports/projectAiSummaryRepository";

export type CachedProjectAiSummary = {
  summary: string;
  warnings: ProjectAiInsightRow[];
  nextTasks: NextTask[];
  refreshedAt: string;
} | null;

export async function getCachedProjectAiSummary(
  projectId: string,
  deps: {
    aiSummaries: ProjectAiSummaryRepository;
    nextTasks: ProjectAiNextTaskRepository;
  },
): Promise<CachedProjectAiSummary> {
  const [summaryRow, nextTaskRow] = await Promise.all([
    deps.aiSummaries.findByProject(projectId),
    deps.nextTasks.findByProject(projectId),
  ]);
  if (!summaryRow) return null;
  return {
    summary: summaryRow.summary,
    warnings: summaryRow.warnings,
    nextTasks: nextTaskRow?.tasks ?? [],
    refreshedAt: summaryRow.refreshedAt.toISOString(),
  };
}
