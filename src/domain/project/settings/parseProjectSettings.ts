import {
  ANALYSIS_STYLES,
  ANALYSIS_TARGETS,
  AUTOMATION_MODES,
  DEFAULT_PROJECT_SETTINGS,
  PROJECT_TYPES,
  type AnalysisStyle,
  type AnalysisTarget,
  type AutomationMode,
  type ProjectSettings,
  type ProjectType,
} from "@/domain/project/settings/types";

export function parseProjectSettings(raw: unknown): ProjectSettings {
  if (!isRecord(raw)) return DEFAULT_PROJECT_SETTINGS;

  const projectType = pickEnum<ProjectType>(raw.projectType, PROJECT_TYPES);
  const ai = isRecord(raw.ai) ? raw.ai : {};
  const targetsRaw = Array.isArray(ai.targets) ? ai.targets : [];
  const targets: AnalysisTarget[] = [];
  for (const t of targetsRaw) {
    const valid = pickEnum<AnalysisTarget>(t, ANALYSIS_TARGETS);
    if (valid && !targets.includes(valid)) targets.push(valid);
  }

  return {
    projectType: projectType ?? DEFAULT_PROJECT_SETTINGS.projectType,
    ai: {
      targets:
        targets.length > 0 ? targets : DEFAULT_PROJECT_SETTINGS.ai.targets,
      style:
        pickEnum<AnalysisStyle>(ai.style, ANALYSIS_STYLES) ??
        DEFAULT_PROJECT_SETTINGS.ai.style,
      automation:
        pickEnum<AutomationMode>(ai.automation, AUTOMATION_MODES) ??
        DEFAULT_PROJECT_SETTINGS.ai.automation,
    },
  };
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly string[],
): T | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value) ? (value as T) : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
