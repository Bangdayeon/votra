import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { SessionLogRecord, TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type FinishTaskInput = {
  seq: number;
  userId: string;
  projectId: string;
  summary: string;
  aiTool: string;
};

export type FinishTaskResult = {
  task: TaskRecord;
  sessionLog: SessionLogRecord;
};

export async function finishTask(
  input: FinishTaskInput,
  deps: { tasks: TaskRepository; sessionLogs: SessionLogRepository },
): Promise<Result<FinishTaskResult, string>> {
  try {
    const task = await deps.tasks.update({ seq: input.seq, userId: input.userId, status: "DONE" });
    if (!task) return err(`태스크 #${input.seq}를 찾을 수 없거나 권한이 없어요.`);

    const sessionLog = await deps.sessionLogs.save({
      summary: input.summary,
      aiTool: input.aiTool,
      projectId: input.projectId,
      userId: input.userId,
    });

    return ok({ task, sessionLog });
  } catch (e) {
    return err(e instanceof Error ? e.message : "태스크 완료 처리에 실패했어요.");
  }
}
