export type SessionEventRow = {
  id: string;
  type:
    | "PROMPT"
    | "ASSISTANT"
    | "TOOL_CALL"
    | "FILE_EDIT"
    | "ERROR"
    | "COMMIT"
    | "SYSTEM"
    | "SESSION_META";
  role: string | null;
  content: string | null;
  timestamp: Date;
  /** path · toolName · errorType · isError */
  metadata: Record<string, unknown> | null;
};

export type SessionWithEvents = {
  id: string;
  title: string | null;
  source: string;
  startedAt: Date | null;
  events: SessionEventRow[];
};

export type SessionRepository = {
  findRecentSessionsWithEvents: (
    projectId: string,
    limit: number,
  ) => Promise<SessionWithEvents[]>;
};
