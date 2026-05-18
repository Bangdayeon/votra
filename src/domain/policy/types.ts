/** AI 정책 평가 규칙 — DB 의 PolicyRule 1 행을 도메인 표현으로. */
export type PolicyRule = {
  /** ClaudeFileScore 의 키와 1:1. ScoreBreakdown UI 에서 매핑에 사용. */
  key: string;
  label: string;
  description: string;
  maxPoints: number;
  displayOrder: number;
};
