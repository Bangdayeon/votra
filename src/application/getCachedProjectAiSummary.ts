import type {
  ProjectAiInsightRow,
  ProjectAiSummaryRepository,
} from "@/application/ports/projectAiSummaryRepository";

export type CachedProjectAiSummary = {
  summary: string;
  warnings: ProjectAiInsightRow[];
  suggestions: ProjectAiInsightRow[];
  refreshedAt: string;
} | null;

export async function getCachedProjectAiSummary(
  projectId: string,
  deps: { aiSummaries: ProjectAiSummaryRepository },
): Promise<CachedProjectAiSummary> {
  const row = await deps.aiSummaries.findByProject(projectId);
  if (!row) return null;
  return {
    summary: row.summary,
    warnings: row.warnings,
    suggestions: row.suggestions,
    refreshedAt: row.refreshedAt.toISOString(),
  };
}
