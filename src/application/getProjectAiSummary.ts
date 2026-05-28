import type { LlmClient } from "@/application/ports/llmClient";
import { DEFAULT_ANALYSIS_INSTRUCTION } from "@/domain/project/settings/defaultAnalysisInstruction";
import type { ProjectSettings } from "@/domain/project/settings/types";

export type ProjectAiInsight = {
  message: string;
  agentCommand: string;
};

export type ProjectAiSummary = {
  summary: string;
  warnings: ProjectAiInsight[];
  suggestions: ProjectAiInsight[];
};

export type TaskSummaryItem = {
  seq: number;
  title: string;
  status: string;
  updatedAt: Date;
};

export async function getProjectAiSummary(
  settings: ProjectSettings,
  deps: { llm: LlmClient },
  tasks: TaskSummaryItem[] = [],
): Promise<ProjectAiSummary> {
  const prompt = buildPrompt(settings, tasks);

  const text = await deps.llm.complete({
    system: "출력은 반드시 지정된 JSON 형식만 반환하세요. 다른 텍스트 금지.",
    prompt,
    maxTokens: 2048,
  });

  return parseAiSummary(text);
}

function buildPrompt(settings: ProjectSettings, tasks: TaskSummaryItem[]): string {
  const customInstructions = settings.ai.analysisInstruction.trim();
  const customPart = customInstructions ? `\n[추가 지침]\n${customInstructions}\n` : "\n";

  const emptySessionData = JSON.stringify(
    { recentSessions: [], repeatedFiles: [], riskSignals: [] },
    null,
    2,
  );

  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const taskData = JSON.stringify(
    {
      recentlyModified: tasks.map((t) => ({
        seq: t.seq,
        title: t.title,
        status: t.status,
        updatedAt: t.updatedAt.toISOString().slice(0, 10),
      })),
      pendingCount,
      inProgressCount,
    },
    null,
    2,
  );

  return DEFAULT_ANALYSIS_INSTRUCTION
    .replace(/\{customInstructions\}/g, customPart)
    .replace(/\{sessionData\}/g, emptySessionData)
    .replace(/\{taskData\}/g, taskData);
}

function parseAiSummary(text: string): ProjectAiSummary {
  const cleaned = stripCodeFence(text).trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!isRecord(parsed)) throw new Error("AI 응답이 객체가 아니에요.");
  if (typeof parsed.summary !== "string") throw new Error("AI 응답에 summary 가 없어요.");
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
    const agentCommand = typeof item.agentCommand === "string" ? item.agentCommand : "";
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
