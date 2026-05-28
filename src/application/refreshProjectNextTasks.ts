import { getProjectNextTasks } from "@/application/getProjectNextTasks";
import type { LlmClient } from "@/application/ports/llmClient";
import type {
  NextTask,
  ProjectAiNextTaskRepository,
} from "@/application/ports/projectAiNextTaskRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
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
    tasks: TaskRepository;
    llm: LlmClient;
  },
): Promise<RefreshedProjectNextTasks> {
  const [settingsRow, recentTasks, pendingTasks] = await Promise.all([
    deps.projects.findSettings(projectId),
    deps.tasks.findRecentByUpdatedAt({ projectId, limit: 10 }),
    deps.tasks.listByFilter({ projectId, status: "PENDING", limit: 10 }),
  ]);
  const settings = parseProjectSettings(settingsRow.settings);

  const seenIds = new Set(recentTasks.map((t) => t.id));
  const mergedTasks = [
    ...recentTasks,
    ...pendingTasks.filter((t) => !seenIds.has(t.id)),
  ];

  const tasks = await getProjectNextTasks(settings, { llm: deps.llm }, mergedTasks);

  const saved = await deps.nextTasks.upsert({ projectId, tasks });

  return {
    tasks: saved.tasks,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
