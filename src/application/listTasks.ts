import type {
  TaskListFilter,
  TaskRepository,
} from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listTasks(
  filter: TaskListFilter,
  deps: { tasks: TaskRepository },
): Promise<Result<TaskRecord[], string>> {
  try {
    const tasks = await deps.tasks.listByFilter(filter);
    return ok(tasks);
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 목록 조회에 실패했어요.");
  }
}
