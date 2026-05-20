import type { ParsedDoc } from "@/domain/doc/types";
import type { ParsedSession } from "@/domain/session/types";

export type DocFlowView = {
  docs: { filePath: string; lastModified: Date; content: string }[];
  sessionTimeline: {
    startedAt: Date;
    intentHint: string;
    filesModified: string[];
  }[];
};

const DOC_CONTENT_MAX = 3_000;

/**
 * AI 지시 문서 흐름 진단 기능용 뷰.
 * 문서 내용은 3,000자로 잘라 토큰 과다 사용을 방지한다.
 * 세션은 오래된 순 정렬 후 최근 20개로 제한한다.
 */
export function buildDocFlowView(
  docs: ParsedDoc[],
  sessions: ParsedSession[],
): DocFlowView {
  const sessionTimeline = [...sessions]
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .slice(-20)
    .map((s) => ({
      startedAt: s.startedAt,
      intentHint: s.intentHint,
      filesModified: s.filesModified,
    }));

  return {
    docs: docs.map((d) => ({
      filePath: d.filePath,
      lastModified: d.lastModified,
      content:
        d.content.length > DOC_CONTENT_MAX
          ? d.content.slice(0, DOC_CONTENT_MAX) + "\n…(truncated)"
          : d.content,
    })),
    sessionTimeline,
  };
}
