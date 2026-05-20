import type { ParsedDoc } from "@/domain/doc/types";
import type { ParsedSession } from "@/domain/session/types";

export type DocFlowView = {
  docs: { filePath: string; content: string }[];
  sessionTimeline: { startedAt: Date; filesModified: string[] }[];
};

/**
 * AI 지시 문서 흐름 진단 기능용 뷰.
 * 문서 전체 내용과 세션별 날짜·수정파일 타임라인을 반환한다.
 */
export function buildDocFlowView(
  docs: ParsedDoc[],
  sessions: ParsedSession[],
): DocFlowView {
  const sessionTimeline = [...sessions]
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((s) => ({ startedAt: s.startedAt, filesModified: s.filesModified }));

  return {
    docs: docs.map((d) => ({ filePath: d.filePath, content: d.content })),
    sessionTimeline,
  };
}
