import type { SessionLogRecord } from "@/domain/memory/types";

export type SessionLogCreateInput = {
  summary: string;
  aiTool: string;
  projectId: string;
  userId: string;
};

export type SessionLogRepository = {
  create: (input: SessionLogCreateInput) => Promise<SessionLogRecord>;
  listRecent: (args: { projectId: string; userId: string; limit: number }) => Promise<SessionLogRecord[]>;
};
