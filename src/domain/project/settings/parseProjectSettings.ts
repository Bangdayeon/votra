import {
  AI_ANALYSIS_INSTRUCTION_MAX,
  AI_NEXT_TASK_PROMPT_MAX,
  DEFAULT_PROJECT_SETTINGS,
  type ProjectSettings,
} from "@/domain/project/settings/types";

const SYSTEM_PROMPT_PREFIX = "당신은 AI 코딩 세션 분석 전문가입니다.";

export function parseProjectSettings(raw: unknown): ProjectSettings {
  if (!isRecord(raw)) return DEFAULT_PROJECT_SETTINGS;

  const ai = isRecord(raw.ai) ? raw.ai : {};

  const rawInstruction = typeof ai.analysisInstruction === "string"
    ? ai.analysisInstruction.slice(0, AI_ANALYSIS_INSTRUCTION_MAX)
    : "";
  // 이전에 전체 시스템 프롬프트가 저장됐던 경우 빈 값으로 초기화
  const analysisInstruction = rawInstruction.startsWith(SYSTEM_PROMPT_PREFIX)
    ? ""
    : rawInstruction;

  const nextTaskPrompt =
    typeof ai.nextTaskPrompt === "string"
      ? ai.nextTaskPrompt.slice(0, AI_NEXT_TASK_PROMPT_MAX)
      : "";

  return { ai: { analysisInstruction, nextTaskPrompt } };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
