import type { GitCommit } from "@/application/ports/gitClient";
import type { LlmClient } from "@/application/ports/llmClient";
import { DEFAULT_ANALYSIS_INSTRUCTION } from "@/domain/project/settings/defaultAnalysisInstruction";
import type { TaskRecord } from "@/domain/memory/types";
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

// Keep for external callers that still reference this type
export type TaskSummaryItem = {
  seq: number;
  title: string;
  status: string;
  updatedAt: Date;
};

export async function getProjectAiSummary(
  settings: ProjectSettings,
  deps: { llm: LlmClient },
  tasks: TaskRecord[] = [],
  commits: GitCommit[] = [],
  memoryContext?: string,
): Promise<ProjectAiSummary> {
  const prompt = buildPrompt(settings, tasks, commits, memoryContext);

  const text = await deps.llm.complete({
    system: "You are a JSON-only responder. Output must be valid JSON matching the specified schema exactly. No markdown, no explanations, no extra text.",
    prompt,
    maxTokens: 2048,
  });

  return parseAiSummary(text);
}

function buildPrompt(settings: ProjectSettings, tasks: TaskRecord[], commits: GitCommit[], memoryContext?: string): string {
  const customInstructions = settings.ai.analysisInstruction.trim();
  const customPart = customInstructions ? `[Additional instructions]\n${customInstructions}` : "";

  const pending = tasks.filter((t) => t.status === "PENDING");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const done = tasks.filter((t) => t.status === "DONE");

  const taskData = JSON.stringify(
    {
      inProgress: inProgress.map((t) => ({ seq: t.seq, title: t.title })),
      pending: pending.map((t) => ({
        seq: t.seq,
        title: t.title,
        description: t.description ?? undefined,
      })),
      recentlyDone: done.slice(0, 5).map((t) => ({
        seq: t.seq,
        title: t.title,
        outcome: t.outcome ?? undefined,
        keyDecisions: t.keyDecisions.length > 0 ? t.keyDecisions : undefined,
      })),
      recentCommits: commits.length > 0 ? commits : undefined,
      pendingCount: pending.length,
      inProgressCount: inProgress.length,
    },
    null,
    2,
  );

  const memoryPart = memoryContext
    ? `\n## 장기 기억 맥락\n${memoryContext.slice(0, 800)}`
    : "";

  return DEFAULT_ANALYSIS_INSTRUCTION
    .replace(/\{taskData\}/g, taskData)
    .replace(/\{customInstructions\}/g, customPart + memoryPart);
}

function parseAiSummary(text: string): ProjectAiSummary {
  try {
    const cleaned = stripCodeFence(text).trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!isRecord(parsed)) throw new Error("AI 응답이 객체가 아니에요.");
    if (typeof parsed.summary !== "string") throw new Error("AI 응답에 summary 가 없어요.");
    return {
      summary: parsed.summary,
      warnings: parseInsightList(parsed.warnings),
      suggestions: parseInsightList(parsed.suggestions),
    };
  } catch (e) {
    throw e instanceof Error ? e : new Error("AI 응답 파싱에 실패했어요.");
  }
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
