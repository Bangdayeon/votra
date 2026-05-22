import type {
  TaskRepository,
  TaskUpdateInput,
} from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function updateTask(
  input: TaskUpdateInput,
  deps: { tasks: TaskRepository },
): Promise<Result<TaskRecord, string>> {
  try {
    const task = await deps.tasks.update(input);
    if (!task) return err(`태스크 #${input.seq}를 찾을 수 없거나 권한이 없어요.`);
    return ok(task);
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 업데이트에 실패했어요.");
  }
}
