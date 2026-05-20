import type { ParsedDoc } from "@/domain/doc/types";
import type { ParsedSession } from "@/domain/session/types";

export type DocEvalView = {
  docs: { filePath: string; sections: { heading: string; body: string }[] }[];
  recentIntentHints: string[];
};

/**
 * AI 지시 문서 평가 기능용 뷰.
 * 문서 섹션 구조와 최근 5개 세션의 intentHint를 반환한다.
 */
export function buildDocEvalView(
  docs: ParsedDoc[],
  sessions: ParsedSession[],
): DocEvalView {
  const sorted = [...sessions].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

  const recentIntentHints = sorted
    .slice(0, 5)
    .map((s) => s.intentHint)
    .filter((h) => h.length > 0);

  return {
    docs: docs.map((d) => ({ filePath: d.filePath, sections: d.sections })),
    recentIntentHints,
  };
}
