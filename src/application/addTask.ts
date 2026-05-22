import type {
  TaskCreateInput,
  TaskRepository,
} from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function addTask(
  input: TaskCreateInput,
  deps: { tasks: TaskRepository },
): Promise<Result<TaskRecord, string>> {
  try {
    const task = await deps.tasks.create(input);
    return ok(task);
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 생성에 실패했어요.");
  }
}
