export type ClaudeFileKind = "CLAUDE" | "AGENTS" | "SKILL";

export type ClaudeFileScope = "global" | "project-root" | "subdir";

/** 평가 결과 단계 — 🔴/⚠️/✅. status=DONE 일 때만 의미가 있음. */
export type ClaudeFileSeverity = "OK" | "WARNING" | "DANGER";

/** 평가 진행 상태. 로딩/에러도 DB 에 저장한다. */
export type ClaudeFileEvaluationStatus =
  | "PENDING"
  | "LOADING"
  | "DONE"
  | "ERROR";

/** 어떤 기준을 적용해 평가했는지. 캡션 문구 분기에 사용. */
export type EvaluationCriteria = {
  basic: boolean;
  project: boolean;
  team: boolean;
};

export type ClaudeFileEvaluation =
  | {
      status: "DONE";
      severity: ClaudeFileSeverity;
      criteria: EvaluationCriteria;
      evaluatedAt: number;
    }
  | {
      status: "ERROR";
      errorMessage: string;
      criteria: EvaluationCriteria;
      evaluatedAt: number;
    }
  | { status: "PENDING" | "LOADING"; criteria: EvaluationCriteria };

/** 6 criteria × max points. claude-md-management rubric 기준. */
export type ClaudeFileScore = {
  commands: number; // /20
  architecture: number; // /20
  patterns: number; // /15
  conciseness: number; // /15
  currency: number; // /15
  actionability: number; // /15
  total: number; // /100
};

export type ClaudeFileRecord = {
  /** OS 절대 경로 */
  absPath: string;
  /** scope 안에서의 보기용 상대 경로 (전역: ~/.claude/..., 프로젝트: 파일명, 서브: cwd 기준 상대경로) */
  displayPath: string;
  kind: ClaudeFileKind;
  scope: ClaudeFileScope;
  contentLength: number;
  /** epoch ms */
  mtime: number;
  score: ClaudeFileScore;
  evaluation: ClaudeFileEvaluation;
};
