import type { SessionLogRecord } from "@/domain/memory/types";

export type SessionLogCreateInput = {
  summary: string;
  aiTool: string;
  projectId: string;
  userId: string;
  sessionId?: string;
  // true면 같은 sessionId 레코드가 이미 있을 때 업데이트하지 않음 (Stop 훅용)
  createOnly?: boolean;
};

export type SessionLogRepository = {
  save: (input: SessionLogCreateInput) => Promise<SessionLogRecord>;
  listRecent: (args: { projectId: string; userId: string; limit: number }) => Promise<SessionLogRecord[]>;
};
