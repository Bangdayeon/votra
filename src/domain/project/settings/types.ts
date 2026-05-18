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

export const AUTOMATION_MODES = ["AUTO", "MANUAL"] as const;
export type AutomationMode = (typeof AUTOMATION_MODES)[number];

export type ProjectSettings = {
  projectType: ProjectType;
  /** projectType === "OTHER" 일 때 사용자가 직접 입력한 이름. */
  projectTypeOther: string;
  ai: {
    targets: AnalysisTarget[];
    /** targets 에 "OTHER" 가 포함될 때 사용자가 추가한 자유 항목들. */
    targetsOther: string[];
    style: AnalysisStyle;
    automation: AutomationMode;
  };
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  projectType: "WEB_APP",
  projectTypeOther: "",
  ai: {
    targets: ["ERROR_REPEAT", "SESSION_SUMMARY"],
    targetsOther: [],
    style: "DEVELOPER",
    automation: "MANUAL",
  },
};
