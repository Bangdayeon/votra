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

export async function getProjectAiSummary(
  sessions: ParsedSession[],
  settings: ProjectSettings,
  deps: { llm: LlmClient },
): Promise<ProjectAiSummary> {
  const prompt = buildPrompt(settings, sessions);

  const text = await deps.llm.complete({
    system: "출력은 반드시 지정된 JSON 형식만 반환하세요. 다른 텍스트 금지.",
    prompt,
    maxTokens: 2048,
  });

  return parseAiSummary(text);
}

function buildPrompt(settings: ProjectSettings, sessions: ParsedSession[]): string {
  const customInstructions = settings.ai.analysisInstruction.trim();
  const sessionData = JSON.stringify(buildStatusView(sessions), null, 2);
  const customPart = customInstructions
    ? `\n[추가 지침]\n${customInstructions}\n`
    : "\n";

  return DEFAULT_ANALYSIS_INSTRUCTION
    .replace(/\{customInstructions\}/g, customPart)
    .replace(/\{sessionData\}/g, sessionData);
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
