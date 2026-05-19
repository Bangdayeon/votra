import { getProjectMetrics } from "@/application/getProjectMetrics";
import { getProjectNextTasks } from "@/application/getProjectNextTasks";
import type { LlmClient } from "@/application/ports/llmClient";
import type { ProjectAiNextTaskRepository } from "@/application/ports/projectAiNextTaskRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { SessionRepository } from "@/application/ports/sessionRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";

export type RefreshedProjectNextTasks = {
  tasks: string[];
  refreshedAt: string;
};

export async function refreshProjectNextTasks(
  projectId: string,
  deps: {
    sessions: SessionRepository;
    projects: ProjectRepository;
    nextTasks: ProjectAiNextTaskRepository;
    llm: LlmClient;
  },
): Promise<RefreshedProjectNextTasks> {
  const [metrics, settingsRow] = await Promise.all([
    getProjectMetrics(projectId, { sessions: deps.sessions }),
    deps.projects.findSettings(projectId),
  ]);
  const settings = parseProjectSettings(settingsRow.settings);

  const tasks = await getProjectNextTasks(metrics, settings, { llm: deps.llm });

  const saved = await deps.nextTasks.upsert({ projectId, tasks });

  return {
    tasks: saved.tasks,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
