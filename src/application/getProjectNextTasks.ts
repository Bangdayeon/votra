import type { GitCommit } from "@/application/ports/gitClient";
import type { LlmClient } from "@/application/ports/llmClient";
import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { DEFAULT_NEXT_TASK_PROMPT } from "@/domain/project/settings/defaultNextTaskPrompt";
import type { TaskRecord } from "@/domain/memory/types";
import type { ProjectSettings } from "@/domain/project/settings/types";

const MAX_TITLE_LEN = 80;

export async function getProjectNextTasks(
  settings: ProjectSettings,
  deps: { llm: LlmClient },
  tasks: TaskRecord[] = [],
  commits: GitCommit[] = [],
): Promise<NextTask[]> {
  if (tasks.length === 0 && commits.length === 0) return [];

  const customInstruction = settings.ai.nextTaskPrompt.trim() || DEFAULT_NEXT_TASK_PROMPT;

  const pending = tasks.filter((t) => t.status === "PENDING");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const done = tasks.filter((t) => t.status === "DONE");

  const taskContext = JSON.stringify(
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
    },
    null,
    2,
  );

  const prompt = `
You are an AI project analyst. Analyze the task data below and suggest 2–3 high-impact next actions.

## User instruction
${customInstruction}

## Current task data
${taskContext}

## Rules (strictly follow all)
- Base your suggestions ONLY on the provided task data. Never mention file names, features, or domains not present in the data.
- Use recentlyDone[].outcome and recentlyDone[].keyDecisions as primary evidence when available. If they are missing, use task titles and recentCommits as the basis for analysis.
- If recentCommits is provided, treat commit messages as supplementary evidence of what was recently worked on — use them to infer progress and suggest follow-up actions.
- Do NOT simply list pending task titles without analysis. Every suggestion must explain WHY now.
- Prioritize unfinished work or follow-up tasks. If there are no pending tasks, suggest logical next steps based on what was recently completed and committed.
- When recommending a pending task, explicitly state its connection to recently completed work or recent commits.
- Always return at least one suggestion if any tasks or commits are provided. Only return an empty tasks array if both the task list and commit list are completely empty.
- If there is no clear follow-up work, be proactive: suggest improvements to quality (tests, error handling, performance), observability (logging, monitoring), documentation, or the next feature that would naturally follow from completed work. Make the suggestion specific and grounded in the available data — never generic.
- agentCommand: max 2 lines, self-contained natural-language instruction (no setup needed). Must reference the actual task title, outcome content, or commit message.

## Output
Respond in Korean. Return ONLY the following JSON — no other text:
{
  "tasks": [
    {
      "title": "작업 제목 (max 80 chars)",
      "reason": "완료 작업 분석 근거와 지금 해야 하는 이유 (max 300 chars)",
      "priority": "critical" | "high" | "medium" | "low",
      "agentCommand": "AI 에이전트 실행 지시 (max 500 chars)"
    }
  ]
}
`.trim();

  const text = await deps.llm.complete({
    system: "You are a JSON-only responder. Output must be valid JSON matching the specified schema exactly. No markdown, no explanations, no extra text.",
    prompt,
    maxTokens: 2048,
  });

  return parseTasks(text);
}

function parseTasks(text: string): NextTask[] {
  try {
    const cleaned = stripCodeFence(text).trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return [];
    return parsed.tasks.filter(isNextTask).slice(0, 3);
  } catch {
    return [];
  }
}

function isNextTask(v: unknown): v is NextTask {
  if (!isRecord(v)) return false;
  return (
    typeof v.title === "string" && v.title.length > 0 && v.title.length <= MAX_TITLE_LEN &&
    typeof v.reason === "string" && v.reason.length > 0 &&
    (v.priority === "critical" || v.priority === "high" || v.priority === "medium" || v.priority === "low") &&
    typeof v.agentCommand === "string" && v.agentCommand.length > 0
  );
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
