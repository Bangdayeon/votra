import { getProjectNextTasks } from "@/application/getProjectNextTasks";
import type { GitClient } from "@/application/ports/gitClient";
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
    git?: GitClient;
  },
): Promise<RefreshedProjectNextTasks> {
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

  const tasks = await getProjectNextTasks(settings, { llm: deps.llm }, mergedTasks, commits);

  const saved = await deps.nextTasks.upsert({ projectId, tasks });

  return {
    tasks: saved.tasks,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
