"use server";

import { listSessionLogs } from "@/application/listSessionLogs";
import type { SessionLogRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";

export type { SessionLogRecord };

export async function getProjectSessionLogsAction(
  projectId: string,
  limit = 20,
): Promise<SessionLogRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await listSessionLogs(
    { projectId, userId: guard.userId, limit },
    { sessionLogs: prismaSessionLogRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
