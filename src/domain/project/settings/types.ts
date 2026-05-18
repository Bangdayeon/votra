export const PROJECT_TYPES = ["WEB_APP", "MOBILE", "BACKEND", "OTHER"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const ANALYSIS_TARGETS = [
  "ERROR_REPEAT",
  "SAME_FILE_REPEAT",
  "SESSION_SUMMARY",
  "SECURITY_FILE_CHANGE",
] as const;
export type AnalysisTarget = (typeof ANALYSIS_TARGETS)[number];

export const ANALYSIS_STYLES = ["DEVELOPER", "NON_DEVELOPER"] as const;
export type AnalysisStyle = (typeof ANALYSIS_STYLES)[number];

export const AUTOMATION_MODES = ["AUTO", "MANUAL"] as const;
export type AutomationMode = (typeof AUTOMATION_MODES)[number];

export type ProjectSettings = {
  projectType: ProjectType;
  ai: {
    targets: AnalysisTarget[];
    style: AnalysisStyle;
    automation: AutomationMode;
  };
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  projectType: "WEB_APP",
  ai: {
    targets: ["ERROR_REPEAT", "SESSION_SUMMARY"],
    style: "DEVELOPER",
    automation: "AUTO",
  },
};
