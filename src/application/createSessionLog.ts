import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";

export type SessionEngine = {
  structure: (summary: string) => Promise<string>;
};

export async function createSessionLog(
  input: {
    projectId: string;
    userId: string;
    summary: string;
    aiTool?: string;
    sessionId?: string;
  },
  deps: {
    sessionLogs: SessionLogRepository;
    engine: SessionEngine;
  },
): Promise<void> {
  const markdown = await deps.engine.structure(input.summary);
  await deps.sessionLogs.upsertOrCreate({
    projectId: input.projectId,
    userId: input.userId,
    summary: markdown,
    aiTool: input.aiTool ?? "unknown",
    sessionId: input.sessionId,
  });
}
