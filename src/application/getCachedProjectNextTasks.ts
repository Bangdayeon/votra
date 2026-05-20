import type {
  NextTask,
  ProjectAiNextTaskRepository,
} from "@/application/ports/projectAiNextTaskRepository";

export type CachedProjectNextTasks = {
  tasks: NextTask[];
  refreshedAt: string;
} | null;

export async function getCachedProjectNextTasks(
  projectId: string,
  deps: { nextTasks: ProjectAiNextTaskRepository },
): Promise<CachedProjectNextTasks> {
  const row = await deps.nextTasks.findByProject(projectId);
  if (!row) return null;
  return {
    tasks: row.tasks,
    refreshedAt: row.refreshedAt.toISOString(),
  };
}
