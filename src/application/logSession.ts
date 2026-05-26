import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { SessionLogRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type LogSessionInput = {
  summary: string;
  aiTool: string;
  projectId: string;
  userId: string;
  sessionId?: string;
  createOnly?: boolean;
};

export async function logSession(
  input: LogSessionInput,
  deps: { sessionLogs: SessionLogRepository },
): Promise<Result<SessionLogRecord, string>> {
  try {
    const log = await deps.sessionLogs.save(input);
    return ok(log);
  } catch (e) {
    return err(e instanceof Error ? e.message : "세션 로그 저장에 실패했어요.");
  }
}
