import type { EmbeddingClient } from "@/application/ports/embeddingClient";
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
  deps: { tasks: TaskRepository; embedding: EmbeddingClient },
): Promise<Result<TaskRecord[], string>> {
  const limit = input.limit ?? 10;
  try {
    let results: TaskRecord[] = [];
    try {
      const queryEmbedding = await deps.embedding.embed(input.query, "RETRIEVAL_QUERY");
      results = await deps.tasks.searchByVector({
        embedding: queryEmbedding,
        projectId: input.projectId,
        userId: input.userId,
        limit,
      });
    } catch {
      // 임베딩 실패 또는 결과 없으면 ILIKE fallback
    }

    if (results.length === 0) {
      results = await deps.tasks.search({
        query: input.query,
        projectId: input.projectId,
        userId: input.userId,
        limit,
      });
    }

    return ok(results);
  } catch (e) {
    return err(e instanceof Error ? e.message : "검색에 실패했어요.");
  }
}
