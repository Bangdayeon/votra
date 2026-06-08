export const AI_ANALYSIS_INSTRUCTION_MAX = 8000;
export const AI_NEXT_TASK_PROMPT_MAX = 1000;
export const AI_KEY_DECISION_INSTRUCTION_MAX = 300;
export const AI_REFLECTION_INSTRUCTION_MAX = 500;
export const AI_CONTEXT_INSTRUCTION_MAX = 300;

export type ProjectSettings = {
  ai: {
    analysisInstruction: string;
    nextTaskPrompt: string;
    /** 매일 자동 업데이트할 KST 시각 (0–23). null = 사용 안함. */
    autoRefreshHour: number | null;
    keyDecisionInstruction: string;
    reflectionInstruction: string;
    contextInstruction: string;
  };
  memory: {
    /** ACTIVE → ARCHIVED 전환까지 미접근 일수. 기본 30. */
    activeToArchivedDays: number;
    /** ARCHIVED → TRASH 전환까지 추가 일수. 기본 30. */
    archivedToTrashDays: number;
    /** AI reflection 자동 트리거 태스크 완료/생성 누적 수. 기본 5. */
    reflectionThreshold: number;
    /** LONG_TERM 자동 승격 최소 접근 횟수. 기본 3. */
    longTermMinAccessCount: number;
    /** LONG_TERM 자동 승격 최소 우선순위(0-10). 기본 7. */
    longTermMinPriority: number;
  };
  integrations: {
    /** 활성화된 외부 서비스 슬러그 목록 (예: "notion", "slack", "github"). */
    sources: string[];
  };
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  ai: {
    analysisInstruction: "",
    nextTaskPrompt: "",
    autoRefreshHour: null,
    keyDecisionInstruction: "",
    reflectionInstruction: "",
    contextInstruction: "",
  },
  memory: {
    activeToArchivedDays: 30,
    archivedToTrashDays: 30,
    reflectionThreshold: 10,
    longTermMinAccessCount: 3,
    longTermMinPriority: 7,
  },
  integrations: {
    sources: [],
  },
};
