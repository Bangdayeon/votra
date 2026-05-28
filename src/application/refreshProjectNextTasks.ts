import { getProjectNextTasks } from "@/application/getProjectNextTasks";
import type { LlmClient } from "@/application/ports/llmClient";
import type {
  NextTask,
  ProjectAiNextTaskRepository,
} from "@/application/ports/projectAiNextTaskRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";

export type RefreshedProjectNextTasks = {
  tasks: NextTask[];
  refreshedAt: string;
};

export async function refreshProjectNextTasks(
  projectId: string,
  deps: {
    projects: ProjectRepository;
    nextTasks: ProjectAiNextTaskRepository;
    llm: LlmClient;
  },
): Promise<RefreshedProjectNextTasks> {
  const settingsRow = await deps.projects.findSettings(projectId);
  const settings = parseProjectSettings(settingsRow.settings);

  const tasks = await getProjectNextTasks(settings, { llm: deps.llm });

  const saved = await deps.nextTasks.upsert({ projectId, tasks });

  return {
    tasks: saved.tasks,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
