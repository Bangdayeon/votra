import {
  AI_ANALYSIS_INSTRUCTION_MAX,
  AI_NEXT_TASK_PROMPT_MAX,
  ANALYSIS_STYLES,
  ANALYSIS_TARGETS,
  DEFAULT_PROJECT_SETTINGS,
  PROJECT_TYPES,
  type AnalysisStyle,
  type AnalysisTarget,
  type ProjectSettings,
  type ProjectType,
} from "@/domain/project/settings/types";

const PROJECT_TYPE_OTHER_MAX = 80;
const TARGET_OTHER_ITEM_MAX = 80;
const TARGET_OTHER_LIST_MAX = 20;

export function parseProjectSettings(raw: unknown): ProjectSettings {
  if (!isRecord(raw)) return DEFAULT_PROJECT_SETTINGS;

  const projectType =
    pickEnum<ProjectType>(raw.projectType, PROJECT_TYPES) ??
    DEFAULT_PROJECT_SETTINGS.projectType;
  const projectTypeOther =
    typeof raw.projectTypeOther === "string"
      ? raw.projectTypeOther.slice(0, PROJECT_TYPE_OTHER_MAX)
      : "";

  const ai = isRecord(raw.ai) ? raw.ai : {};
  const targetsRaw = Array.isArray(ai.targets) ? ai.targets : [];
  const targets: AnalysisTarget[] = [];
  for (const t of targetsRaw) {
    const valid = pickEnum<AnalysisTarget>(t, ANALYSIS_TARGETS);
    if (valid && !targets.includes(valid)) targets.push(valid);
  }

  const targetsOtherRaw = Array.isArray(ai.targetsOther) ? ai.targetsOther : [];
  const targetsOther: string[] = [];
  for (const item of targetsOtherRaw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, TARGET_OTHER_ITEM_MAX);
    if (trimmed.length === 0) continue;
    if (targetsOther.includes(trimmed)) continue;
    targetsOther.push(trimmed);
    if (targetsOther.length >= TARGET_OTHER_LIST_MAX) break;
  }

  const analysisInstruction =
    typeof ai.analysisInstruction === "string"
      ? ai.analysisInstruction.slice(0, AI_ANALYSIS_INSTRUCTION_MAX)
      : DEFAULT_PROJECT_SETTINGS.ai.analysisInstruction;

  const nextTaskPrompt =
    typeof ai.nextTaskPrompt === "string"
      ? ai.nextTaskPrompt.slice(0, AI_NEXT_TASK_PROMPT_MAX)
      : "";

  return {
    projectType,
    projectTypeOther,
    ai: {
      targets:
        targets.length > 0 ? targets : DEFAULT_PROJECT_SETTINGS.ai.targets,
      targetsOther,
      style:
        pickEnum<AnalysisStyle>(ai.style, ANALYSIS_STYLES) ??
        DEFAULT_PROJECT_SETTINGS.ai.style,
      analysisInstruction,
      nextTaskPrompt,
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
