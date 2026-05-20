import type { LlmClient } from "@/application/ports/llmClient";
import { buildStatusView } from "@/application/views/buildStatusView";
import { DEFAULT_ANALYSIS_INSTRUCTION } from "@/domain/project/settings/defaultAnalysisInstruction";
import type { ProjectSettings } from "@/domain/project/settings/types";
import type { ParsedSession } from "@/domain/session/types";

export type ProjectAiInsight = {
  message: string;
  agentCommand: string;
};

export type ProjectAiSummary = {
  summary: string;
  warnings: ProjectAiInsight[];
  suggestions: ProjectAiInsight[];
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WEB_APP: "웹앱",
  MOBILE_NATIVE: "모바일 네이티브 앱",
  BACKEND: "백엔드",
  OTHER: "기타",
};

const ANALYSIS_TARGET_LABELS: Record<string, string> = {
  ERROR_REPEAT: "에러 반복 감지",
  SAME_FILE_REPEAT: "동일 파일 반복 수정 감지",
  SESSION_SUMMARY: "세션 요약 생성",
  SECURITY_FILE_CHANGE: "보안 관련 파일 변경 감지",
  OTHER: "기타",
};

const STYLE_LABELS: Record<string, string> = {
  DEVELOPER: "개발자",
  NON_DEVELOPER: "비개발자",
};

export async function getProjectAiSummary(
  sessions: ParsedSession[],
  settings: ProjectSettings,
  deps: { llm: LlmClient },
): Promise<ProjectAiSummary> {
  const template =
    settings.ai.analysisInstruction.trim().length > 0
      ? settings.ai.analysisInstruction
      : DEFAULT_ANALYSIS_INSTRUCTION;

  const prompt = applyTemplate(template, settings, sessions);

  const text = await deps.llm.complete({
    system: "출력은 반드시 지정된 JSON 형식만 반환하세요. 다른 텍스트 금지.",
    prompt,
    maxTokens: 2048,
  });

  return parseAiSummary(text);
}

function applyTemplate(
  template: string,
  settings: ProjectSettings,
  sessions: ParsedSession[],
): string {
  const projectType = formatProjectType(settings);
  const analysisTargets = formatTargets(settings);
  const reportStyle = STYLE_LABELS[settings.ai.style] ?? settings.ai.style;
  const sessionData = JSON.stringify(buildStatusView(sessions), null, 2);

  return template
    .replace(/\{projectType\}/g, projectType)
    .replace(/\{analysisTargets\}/g, analysisTargets)
    .replace(/\{reportStyle\}/g, reportStyle)
    .replace(/\{customInstructions\}/g, "")
    .replace(/\{sessionData\}/g, sessionData)
    .replace(/^- 추가 지침:\s*\n/gm, "");
}

function formatProjectType(settings: ProjectSettings): string {
  if (settings.projectType === "OTHER") {
    const other = settings.projectTypeOther.trim();
    return other ? `기타 (${other})` : "기타";
  }
  return PROJECT_TYPE_LABELS[settings.projectType] ?? settings.projectType;
}

function formatTargets(settings: ProjectSettings): string {
  const labels = settings.ai.targets
    .filter((t) => t !== "OTHER")
    .map((t) => ANALYSIS_TARGET_LABELS[t] ?? t);
  const others = settings.ai.targets.includes("OTHER")
    ? settings.ai.targetsOther.map((o) => o.trim()).filter(Boolean)
    : [];
  const all = [...labels, ...others];
  return all.length === 0 ? "(지정 없음)" : all.join(", ");
}


function parseAiSummary(text: string): ProjectAiSummary {
  const cleaned = stripCodeFence(text).trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("AI 응답이 객체가 아니에요.");
  }
  if (typeof parsed.summary !== "string") {
    throw new Error("AI 응답에 summary 가 없어요.");
  }
  return {
    summary: parsed.summary,
    warnings: parseInsightList(parsed.warnings),
    suggestions: parseInsightList(parsed.suggestions),
  };
}

function parseInsightList(raw: unknown): ProjectAiInsight[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectAiInsight[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const message = typeof item.message === "string" ? item.message : "";
    const agentCommand =
      typeof item.agentCommand === "string" ? item.agentCommand : "";
    if (!message && !agentCommand) continue;
    out.push({ message, agentCommand });
  }
  return out;
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
