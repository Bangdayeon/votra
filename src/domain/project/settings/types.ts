import { DEFAULT_ANALYSIS_INSTRUCTION } from "@/domain/project/settings/defaultAnalysisInstruction";

export const PROJECT_TYPES = [
  "WEB_APP",
  "MOBILE_NATIVE",
  "BACKEND",
  "OTHER",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const ANALYSIS_TARGETS = [
  "ERROR_REPEAT",
  "SAME_FILE_REPEAT",
  "SESSION_SUMMARY",
  "SECURITY_FILE_CHANGE",
  "OTHER",
] as const;
export type AnalysisTarget = (typeof ANALYSIS_TARGETS)[number];

export const ANALYSIS_STYLES = ["DEVELOPER", "NON_DEVELOPER"] as const;
export type AnalysisStyle = (typeof ANALYSIS_STYLES)[number];

export const AI_ANALYSIS_INSTRUCTION_MAX = 8000;
export const AI_NEXT_TASK_PROMPT_MAX = 1000;
export const AGENT_CONTEXT_FLOW_PROMPT_MAX = 8000;

export type ProjectSettings = {
  projectType: ProjectType;
  /** projectType === "OTHER" 일 때 사용자가 직접 입력한 이름. */
  projectTypeOther: string;
  ai: {
    targets: AnalysisTarget[];
    /** targets 에 "OTHER" 가 포함될 때 사용자가 추가한 자유 항목들. */
    targetsOther: string[];
    style: AnalysisStyle;
    /** AI 요약/솔루션 생성 시 추가로 줄 사용자 지침 (자유 텍스트). */
    analysisInstruction: string;
    /** 다음 작업 추천 생성 시 AI 에게 줄 추가 프롬프트. */
    nextTaskPrompt: string;
  };
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  projectType: "WEB_APP",
  projectTypeOther: "",
  ai: {
    targets: ["ERROR_REPEAT", "SESSION_SUMMARY"],
    targetsOther: [],
    style: "DEVELOPER",
    analysisInstruction: DEFAULT_ANALYSIS_INSTRUCTION,
    nextTaskPrompt: "",
  },
};
