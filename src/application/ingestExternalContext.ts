import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type IngestExternalContextInput = {
  projectId: string;
  userId: string;
  title: string;
  content: string;
  source: string;
  keyDecisions: string[];
  type?: "decision" | "insight" | "reference";
};

export type IngestExternalContextResult = {
  task: TaskRecord;
};

export async function ingestExternalContext(
  input: IngestExternalContextInput,
  deps: { tasks: TaskRepository },
): Promise<Result<IngestExternalContextResult, string>> {
  try {
    const taskTitle =
      input.type && input.type !== "decision"
        ? `[${input.type}] ${input.title}`
        : input.title;

    const created = await deps.tasks.create({
      title: taskTitle,
      description: input.content.slice(0, 500),
      tool: "integration",
      projectId: input.projectId,
      userId: input.userId,
    });

    const updated = await deps.tasks.update({
      seq: created.seq,
      userId: input.userId,
      status: "DONE",
      keyDecisions: input.keyDecisions,
      outcome: `[${input.source}] ${input.content.slice(0, 1000)}`,
    });

    if (!updated) return err(`태스크 #${created.seq} 완료 처리에 실패했어요.`);
    return ok({ task: updated });
  } catch (e) {
    return err(e instanceof Error ? e.message : "외부 맥락 저장에 실패했어요.");
  }
}
