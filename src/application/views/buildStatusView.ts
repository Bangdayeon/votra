import type { ParsedSession } from "@/domain/session/types";

const RISK_KEYWORDS = ["deploy", "auth", "migration", "secret", "env", "config", "db"];

export type StatusView = {
  recentSessions: {
    title: string;
    intentHint: string;
    filesModified: string[];
    errors: { type: string; context: string }[];
    toolCallCounts: Record<string, number>;
  }[];
  repeatedFiles: string[];
  riskSignals: { file: string; reason: string }[];
};

/**
 * AI 요약·솔루션 기능용 뷰.
 * 최근 5개 세션의 파일·툴·에러 패턴과 리스크 시그널을 반환한다.
 */
export function buildStatusView(sessions: ParsedSession[]): StatusView {
  const recent = [...sessions]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 5);

  const recentSessions = recent.map((s) => ({
    title: s.title,
    intentHint: s.intentHint,
    filesModified: s.filesModified,
    errors: s.errors,
    toolCallCounts: s.toolCallCounts,
  }));

  const fileSessionCount = new Map<string, number>();
  for (const s of recent) {
    for (const file of new Set(s.filesModified)) {
      fileSessionCount.set(file, (fileSessionCount.get(file) ?? 0) + 1);
    }
  }
  const repeatedFiles = [...fileSessionCount.entries()]
    .filter(([, count]) => count >= 2)
    .map(([file]) => file);

  const riskSignals: { file: string; reason: string }[] = [];
  for (const file of repeatedFiles) {
    const lower = file.toLowerCase();
    const matched = RISK_KEYWORDS.find((kw) => lower.includes(kw));
    if (matched) {
      riskSignals.push({ file, reason: `리스크 관련 파일(${matched}) 반복 수정` });
    }
  }

  return { recentSessions, repeatedFiles, riskSignals };
}
