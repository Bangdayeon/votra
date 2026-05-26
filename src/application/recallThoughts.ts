import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type RecallThoughtsInput = {
  query: string;
  projectId: string;
  userId: string;
  limit?: number;
};

export async function recallThoughts(
  input: RecallThoughtsInput,
  deps: { tasks: TaskRepository },
): Promise<Result<TaskRecord[], string>> {
  try {
    const results = await deps.tasks.search({
      query: input.query,
      projectId: input.projectId,
      userId: input.userId,
      limit: input.limit ?? 10,
    });
    return ok(results);
  } catch (e) {
    return err(e instanceof Error ? e.message : "검색에 실패했어요.");
  }
}
