export type CreateSessionLogInput = {
  projectId: string;
  userId: string;
  summary: string;
  aiTool: string;
  sessionId?: string;
};

export type SessionLogRecord = {
  id: string;
  projectId: string;
  userId: string;
  summary: string;
  aiTool: string;
  sessionId: string | null;
  createdAt: Date;
};

export type SessionLogRepository = {
  upsertOrCreate: (input: CreateSessionLogInput) => Promise<void>;
  listByProject: (projectId: string, limit: number) => Promise<SessionLogRecord[]>;
  deleteOld: (before: Date) => Promise<number>;
};
