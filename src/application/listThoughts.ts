import type { ThoughtRepository } from "@/application/ports/thoughtRepository";
import type { ThoughtRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listThoughts(
  args: { projectId: string; userId: string; limit?: number },
  deps: { thoughts: ThoughtRepository },
): Promise<Result<ThoughtRecord[], string>> {
  try {
    const records = await deps.thoughts.listRecent({
      projectId: args.projectId,
      userId: args.userId,
      limit: args.limit ?? 20,
    });
    return ok(records);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Thought 목록 조회에 실패했어요.");
  }
}
