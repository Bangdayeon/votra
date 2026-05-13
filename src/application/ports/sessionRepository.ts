export type SessionMetricRow = {
  id: string;
  title: string | null;
  model: string;
  startedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
};

export type ErrorTypeCount = {
  errorType: string;
  count: number;
};

export type SessionRepository = {
  findManyByProject: (projectId: string) => Promise<SessionMetricRow[]>;
  findErrorTypesByProject: (projectId: string) => Promise<ErrorTypeCount[]>;
};
