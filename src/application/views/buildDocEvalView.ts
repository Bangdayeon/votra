import type { ParsedDoc } from "@/domain/doc/types";
import type { ParsedSession } from "@/domain/session/types";

export type DocEvalView = {
  docs: {
    filePath: string;
    lastModified: Date;
    sections: { heading: string; body: string }[];
  }[];
  recentSessionPatterns: {
    intentHint: string;
    filesModified: string[];
    errors: { type: string; context: string }[];
  }[];
};

export type DocEvalResult = {
  docs: {
    filePath: string;
    status: "problem" | "warning" | "good";
    policyViolations: string[];
    feedback: string;
    suggestions: string[];
  }[];
};

/**
 * AI 프롬프트 평가 기능용 뷰.
 * 문서 섹션 구조와 최근 5개 세션의 패턴(intentHint, filesModified, errors)을 반환한다.
 */
export function buildDocEvalView(
  docs: ParsedDoc[],
  sessions: ParsedSession[],
): DocEvalView {
  const sorted = [...sessions].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );

  const recentSessionPatterns = sorted.slice(0, 5).map((s) => ({
    intentHint: s.intentHint,
    filesModified: s.filesModified,
    errors: s.errors,
  }));

  return {
    docs: docs.map((d) => ({
      filePath: d.filePath,
      lastModified: d.lastModified,
      sections: d.sections,
    })),
    recentSessionPatterns,
  };
}
