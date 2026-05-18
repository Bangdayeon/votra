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

/** LLM 이 채점한 PolicyRule.key → 점수 매핑. */
export type AiScores = Record<string, number>;

/**
 * 계정의 "전체 정책" 위반 정보.
 * 위반이 감지되면 severity 는 무조건 DANGER 가 돼요.
 * - problem: 한 줄 문제 진술 (예: "보안 관련 변경에 사람 검토 단계가 빠져 있어요.")
 * - agentCommand: 사용자가 AI agent 에 그대로 붙여 넣어 고치게 할 한국어 지시문.
 */
export type GlobalPolicyViolation = {
  problem: string;
  agentCommand: string;
};

export type ClaudeFileEvaluation =
  | {
      status: "DONE";
      severity: ClaudeFileSeverity;
      /** LLM 이 작성한 한국어 해설 — UI 의 "왜" 설명에 그대로 노출. */
      reason: string;
      /** PolicyRule.key 별 점수. */
      scores: AiScores;
      criteria: EvaluationCriteria;
      /** 계정 전체 정책 위반 감지 결과. 위반 없으면 null. */
      globalPolicyViolation: GlobalPolicyViolation | null;
      evaluatedAt: number;
    }
  | {
      status: "ERROR";
      errorMessage: string;
      criteria: EvaluationCriteria;
      evaluatedAt: number;
    }
  | { status: "PENDING" | "LOADING"; criteria: EvaluationCriteria };

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
  evaluation: ClaudeFileEvaluation;
};
