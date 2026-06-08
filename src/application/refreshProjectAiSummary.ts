import { getProjectAiSummary } from "@/application/getProjectAiSummary";
import type { GitClient } from "@/application/ports/gitClient";
import type { LlmClient } from "@/application/ports/llmClient";
import type { NextTask, ProjectAiNextTaskRepository } from "@/application/ports/projectAiNextTaskRepository";
import type { ProjectAiSummaryRepository } from "@/application/ports/projectAiSummaryRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";

export type RefreshedProjectAiSummary = {
  summary: string;
  warnings: { message: string; agentCommand: string }[];
  nextTasks: NextTask[];
  refreshedAt: string;
};

export async function refreshProjectAiSummary(
  projectId: string,
  deps: {
    projects: ProjectRepository;
    aiSummaries: ProjectAiSummaryRepository;
    nextTasks: ProjectAiNextTaskRepository;
    tasks: TaskRepository;
    llm: LlmClient;
    git?: GitClient;
    memoryContext?: string;
  },
): Promise<RefreshedProjectAiSummary> {
  const [settingsRow, recentByUpdatedAt, pendingTasks, inProgressTasks] = await Promise.all([
    deps.projects.findSettings(projectId),
    deps.tasks.findRecentByUpdatedAt({ projectId, limit: 10 }),
    deps.tasks.listByFilter({ projectId, status: "PENDING", limit: 10 }),
    deps.tasks.listByFilter({ projectId, status: "IN_PROGRESS", limit: 10 }),
  ]);
  const settings = parseProjectSettings(settingsRow.settings);

  const commits =
    settingsRow.cwd && deps.git
      ? await deps.git.getRecentCommits(settingsRow.cwd, 10)
      : [];

  const recentDone = recentByUpdatedAt.filter((t) => t.status === "DONE" || t.status === "CANCELLED");
  const seenIds = new Set([...inProgressTasks, ...pendingTasks].map((t) => t.id));
  const mergedTasks = [
    ...inProgressTasks,
    ...pendingTasks,
    ...recentDone.filter((t) => !seenIds.has(t.id)),
  ];

  const generated = await getProjectAiSummary(settings, { llm: deps.llm }, mergedTasks, commits, deps.memoryContext);

  const [saved, savedNextTasks] = await Promise.all([
    deps.aiSummaries.upsert({
      projectId,
      summary: generated.summary,
      warnings: generated.warnings,
    }),
    deps.nextTasks.upsert({
      projectId,
      tasks: generated.nextTasks,
    }),
  ]);

  return {
    summary: saved.summary,
    warnings: saved.warnings,
    nextTasks: savedNextTasks.tasks,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
