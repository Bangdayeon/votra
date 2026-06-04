import type { TaskRepository } from "@/application/ports/taskRepository";

export async function pinTask(
  taskId: string,
  isPinned: boolean,
  deps: { tasks: TaskRepository },
): Promise<void> {
  await deps.tasks.updateMemoryTier({
    taskId,
    tier: isPinned ? "LONG_TERM" : "ACTIVE",
    isPinned,
  });
}
