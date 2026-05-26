import type { ThoughtRepository } from "@/application/ports/thoughtRepository";
import type { ThoughtRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type RememberThoughtInput = {
  content: string;
  tags: string[];
  projectId: string;
  userId: string;
};

export async function rememberThought(
  input: RememberThoughtInput,
  deps: { thoughts: ThoughtRepository },
): Promise<Result<ThoughtRecord, string>> {
  try {
    const thought = await deps.thoughts.create({
      content: input.content,
      tags: input.tags,
      projectId: input.projectId,
      userId: input.userId,
    });
    return ok(thought);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Thought 저장에 실패했어요.");
  }
}
