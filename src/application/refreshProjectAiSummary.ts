import { getProjectAiSummary } from "@/application/getProjectAiSummary";
import { getProjectMetrics } from "@/application/getProjectMetrics";
import type { LlmClient } from "@/application/ports/llmClient";
import type {
  ProjectAiInsightRow,
  ProjectAiSummaryRepository,
} from "@/application/ports/projectAiSummaryRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { SessionRepository } from "@/application/ports/sessionRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";

export type RefreshedProjectAiSummary = {
  summary: string;
  warnings: ProjectAiInsightRow[];
  suggestions: ProjectAiInsightRow[];
  refreshedAt: string;
};

export async function refreshProjectAiSummary(
  projectId: string,
  deps: {
    sessions: SessionRepository;
    projects: ProjectRepository;
    aiSummaries: ProjectAiSummaryRepository;
    llm: LlmClient;
  },
): Promise<RefreshedProjectAiSummary> {
  const [metrics, settingsRow] = await Promise.all([
    getProjectMetrics(projectId, { sessions: deps.sessions }),
    deps.projects.findSettings(projectId),
  ]);
  const settings = parseProjectSettings(settingsRow.settings);

  const generated = await getProjectAiSummary(metrics, settings, {
    llm: deps.llm,
  });

  const saved = await deps.aiSummaries.upsert({
    projectId,
    summary: generated.summary,
    warnings: generated.warnings,
    suggestions: generated.suggestions,
  });

  return {
    summary: saved.summary,
    warnings: saved.warnings,
    suggestions: saved.suggestions,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
