import type { EmbeddingClient } from "@/application/ports/embeddingClient";
import type {
  ThoughtRepository,
  ThoughtSearchRow,
} from "@/application/ports/thoughtRepository";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type RecallThoughtsInput = {
  query: string;
  projectId: string;
  userId: string;
  limit?: number;
  minSimilarity?: number;
};

export async function recallThoughts(
  input: RecallThoughtsInput,
  deps: { embedding: EmbeddingClient; thoughts: ThoughtRepository },
): Promise<Result<ThoughtSearchRow[], string>> {
  try {
    const queryEmbedding = await deps.embedding.embed(input.query);
    const results = await deps.thoughts.search({
      queryEmbedding,
      projectId: input.projectId,
      userId: input.userId,
      limit: input.limit ?? 10,
      minSimilarity: input.minSimilarity,
    });
    return ok(results);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Thought 검색에 실패했어요.");
  }
}
