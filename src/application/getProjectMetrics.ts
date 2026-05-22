import type { SessionRepository } from "@/application/ports/sessionRepository";

export type SessionTokenRow = {
  id: string;
  title: string;
  model: string;
  source: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  startedAt: string | null;
};

export type ModelUsageRow = {
  model: string;
  sessionCount: number;
  totalTokens: number;
};

export type ErrorTypeRow = {
  errorType: string;
  count: number;
};

export type ProjectMetrics = {
  sessions: SessionTokenRow[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    sessionCount: number;
  };
  byModel: ModelUsageRow[];
  byErrorType: ErrorTypeRow[];
};

export async function getProjectMetrics(
  projectId: string,
  deps: { sessions: SessionRepository },
): Promise<ProjectMetrics> {
  const [sessions, errorTypes] = await Promise.all([
    deps.sessions.findManyByProject(projectId),
    deps.sessions.findErrorTypesByProject(projectId),
  ]);

  const rows: SessionTokenRow[] = sessions.map((s, idx) => ({
    id: s.id,
    title: s.title ?? `세션 ${idx + 1}`,
    model: s.model,
    source: s.source,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    totalTokens: s.inputTokens + s.outputTokens,
    startedAt: s.startedAt?.toISOString() ?? null,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      inputTokens: acc.inputTokens + r.inputTokens,
      outputTokens: acc.outputTokens + r.outputTokens,
      totalTokens: acc.totalTokens + r.totalTokens,
      sessionCount: acc.sessionCount + 1,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, sessionCount: 0 },
  );

  const modelMap = new Map<string, { sessionCount: number; totalTokens: number }>();
  for (const r of rows) {
    const cur = modelMap.get(r.model) ?? { sessionCount: 0, totalTokens: 0 };
    cur.sessionCount += 1;
    cur.totalTokens += r.totalTokens;
    modelMap.set(r.model, cur);
  }
  const byModel: ModelUsageRow[] = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  return { sessions: rows, totals, byModel, byErrorType: errorTypes };
}
