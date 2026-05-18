/** AI 정책 평가 규칙 — DB 의 PolicyRule 1 행을 도메인 표현으로. */
export type PolicyRule = {
  /** LLM 이 채점할 때 사용하는 stable id. ScoreBreakdown UI 에서 점수 매핑에 사용. */
  key: string;
  label: string;
  description: string;
  maxPoints: number;
  displayOrder: number;
};
