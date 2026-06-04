import type { TaskRepository } from "@/application/ports/taskRepository";

export async function trackTaskAccess(
  taskId: string,
  currentTier: string,
  deps: { tasks: TaskRepository },
): Promise<void> {
  await deps.tasks.trackAccess(taskId);

  // ARCHIVED 상태에서 접근하면 ACTIVE로 복귀 (살아있는 기억으로 재활성화)
  if (currentTier === "ARCHIVED") {
    await deps.tasks.updateMemoryTier({ taskId, tier: "ACTIVE" });
  }
}
