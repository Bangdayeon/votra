import type { ThoughtRepository } from "@/application/ports/thoughtRepository";
import type { ThoughtRecord } from "@/domain/memory/types";
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
  deps: { thoughts: ThoughtRepository },
): Promise<Result<ThoughtRecord[], string>> {
  try {
    const results = await deps.thoughts.search({
      query: input.query,
      projectId: input.projectId,
      userId: input.userId,
      limit: input.limit ?? 10,
    });
    return ok(results);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Thought 검색에 실패했어요.");
  }
}
