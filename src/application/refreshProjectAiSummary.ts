import { getProjectAiSummary } from "@/application/getProjectAiSummary";
import type { LlmClient } from "@/application/ports/llmClient";
import type {
  ProjectAiInsightRow,
  ProjectAiSummaryRepository,
} from "@/application/ports/projectAiSummaryRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
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
    projects: ProjectRepository;
    aiSummaries: ProjectAiSummaryRepository;
    tasks: TaskRepository;
    llm: LlmClient;
  },
): Promise<RefreshedProjectAiSummary> {
  const [settingsRow, recentTasks] = await Promise.all([
    deps.projects.findSettings(projectId),
    deps.tasks.findRecentByUpdatedAt({ projectId, limit: 10 }),
  ]);
  const settings = parseProjectSettings(settingsRow.settings);

  const generated = await getProjectAiSummary(settings, { llm: deps.llm }, recentTasks);

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
