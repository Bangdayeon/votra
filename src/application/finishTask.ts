import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type FinishTaskInput = {
  seq: number;
  userId: string;
  projectId: string;
  summary: string;
  aiTool: string;
  keyDecisions?: string[];
  outcome?: string;
};

export type FinishTaskResult = {
  task: TaskRecord;
};

export async function finishTask(
  input: FinishTaskInput,
  deps: { tasks: TaskRepository },
): Promise<Result<FinishTaskResult, string>> {
  try {
    const task = await deps.tasks.update({
      seq: input.seq,
      userId: input.userId,
      status: "DONE",
      ...(input.keyDecisions !== undefined && { keyDecisions: input.keyDecisions }),
      ...(input.outcome !== undefined && { outcome: input.outcome }),
    });
    if (!task) return err(`태스크 #${input.seq}를 찾을 수 없거나 권한이 없어요.`);

    return ok({ task });
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 완료 처리에 실패했어요.");
  }
}
