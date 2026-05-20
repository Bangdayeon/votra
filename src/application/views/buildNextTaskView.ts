import type { ParsedSession } from "@/domain/session/types";

export type NextTaskView = {
  lastSessionFiles: string[];
  incompleteSignals: { title: string; intentHint: string; errors: { type: string; context: string }[] }[];
  recentWorkFlow: {
    title: string;
    filesModified: string[];
    intentHint: string;
  }[];
};

/**
 * 추천 다음 작업 기능용 뷰.
 * 마지막 세션 포커스 파일, 미완료 세션 신호, 최근 3개 세션 흐름을 반환한다.
 */
export function buildNextTaskView(sessions: ParsedSession[]): NextTaskView {
  const sorted = [...sessions].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

  const lastSession = sorted[0];
  const lastSessionFiles = lastSession?.filesModified ?? [];

  const incompleteSignals = sorted
    .filter((s) => !s.isComplete)
    .slice(0, 3)
    .map((s) => ({ title: s.title, intentHint: s.intentHint, errors: s.errors }));

  const recentWorkFlow = sorted.slice(0, 3).map((s) => ({
    title: s.title,
    filesModified: s.filesModified,
    intentHint: s.intentHint,
  }));

  return { lastSessionFiles, incompleteSignals, recentWorkFlow };
}
