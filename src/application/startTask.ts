import type { TaskCreateInput, TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function startTask(
  input: TaskCreateInput,
  deps: { tasks: TaskRepository },
): Promise<Result<TaskRecord, string>> {
  try {
    const task = await deps.tasks.create(input);
    const started = await deps.tasks.update({ seq: task.seq, userId: input.userId, status: "IN_PROGRESS" });
    if (!started) return err(`태스크 #${task.seq} 상태 변경에 실패했어요.`);
    return ok(started);
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 시작에 실패했어요.");
  }
}
