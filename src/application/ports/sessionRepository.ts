export type SessionMetricRow = {
  id: string;
  title: string | null;
  model: string;
  source: string;
  startedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
};

export type ErrorTypeCount = {
  errorType: string;
  count: number;
};

/** scoreSession 입력 + tooltip 표시용 세션별 raw 신호. 시간순 정렬. */
export type SessionScoringRow = {
  id: string;
  /** Session.title — null 이면 호출자가 fallback */
  title: string | null;
  /** Session.model — "claude-opus-4-7" 같은 raw 값 */
  model: string;
  source: string;
  startedAt: Date | null;
  endedAt: Date | null;
  totalTokens: number;
  retryCount: number;
  /** 같은 errorType 빈도 분석용 (repeatedErrorCount 계산) */
  errorTypes: string[];
  /** Event.type === FILE_EDIT 개수 */
  editCount: number;
  /** FILE_EDIT 이벤트에서 추출한 unique path 들 (등장 순) */
  editedFiles: string[];
  /** Event.type === PROMPT or ASSISTANT 개수 */
  messageCount: number;
};

/** session detail timeline 한 줄 — buildPromptBranches 입력. */
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
  startedAt: Date | null;
  events: SessionEventRow[];
};

export type SessionRepository = {
  findManyByProject: (projectId: string) => Promise<SessionMetricRow[]>;
  findErrorTypesByProject: (projectId: string) => Promise<ErrorTypeCount[]>;
  findScoringRowsByProject: (
    projectId: string,
  ) => Promise<SessionScoringRow[]>;
  findEventsBySession: (sessionId: string) => Promise<SessionEventRow[]>;
  findRecentSessionsWithEvents: (
    projectId: string,
    limit: number,
  ) => Promise<SessionWithEvents[]>;
};
