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

const RRF_K = 60;

export async function recallThoughts(
  input: RecallThoughtsInput,
  deps: { tasks: TaskRepository; embedding: EmbeddingClient },
): Promise<Result<TaskRecord[], string>> {
  const limit = input.limit ?? 10;
  try {
    const [vectorResult, keywordResult] = await Promise.allSettled([
      (async () => {
        const queryEmbedding = await deps.embedding.embed(input.query, "RETRIEVAL_QUERY");
        return deps.tasks.searchByVector({
          embedding: queryEmbedding,
          projectId: input.projectId,
          userId: input.userId,
          limit,
        });
      })(),
      deps.tasks.search({
        query: input.query,
        projectId: input.projectId,
        userId: input.userId,
        limit,
      }),
    ]);

    const vectorHits = vectorResult.status === "fulfilled" ? vectorResult.value : [];
    const keywordHits = keywordResult.status === "fulfilled" ? keywordResult.value : [];

    // RRF: 두 결과를 rank 기반으로 합산
    const scores = new Map<string, { task: TaskRecord; score: number }>();
    for (const [rank, task] of vectorHits.entries()) {
      scores.set(task.id, { task, score: 1 / (RRF_K + rank + 1) });
    }
    for (const [rank, task] of keywordHits.entries()) {
      const add = 1 / (RRF_K + rank + 1);
      const existing = scores.get(task.id);
      if (existing) existing.score += add;
      else scores.set(task.id, { task, score: add });
    }

    const results = [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((e) => e.task);

    return ok(results);
  } catch (e) {
    return err(e instanceof Error ? e.message : "검색에 실패했어요.");
  }
}
