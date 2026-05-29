export const AI_ANALYSIS_INSTRUCTION_MAX = 8000;
export const AI_NEXT_TASK_PROMPT_MAX = 1000;
export const AGENT_CONTEXT_FLOW_PROMPT_MAX = 8000;

export type ProjectSettings = {
  ai: {
    analysisInstruction: string;
    nextTaskPrompt: string;
    /** 매일 자동 업데이트할 KST 시각 (0–23). null = 사용 안함. */
    autoRefreshHour: number | null;
  };
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  ai: {
    analysisInstruction: "",
    nextTaskPrompt: "",
    autoRefreshHour: null,
  },
};
