import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { SessionLogRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listSessionLogs(
  input: { projectId: string; userId: string; limit: number },
  deps: { sessionLogs: SessionLogRepository },
): Promise<Result<SessionLogRecord[], string>> {
  try {
    const logs = await deps.sessionLogs.listRecent(input);
    return ok(logs);
  } catch (e) {
    return err(e instanceof Error ? e.message : "세션 로그 조회에 실패했어요.");
  }
}
