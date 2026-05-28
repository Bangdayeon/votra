import type { LlmClient } from "@/application/ports/llmClient";
import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import type { TaskSummaryItem } from "@/application/getProjectAiSummary";
import type { ProjectSettings } from "@/domain/project/settings/types";

export async function getProjectNextTasks(
  settings: ProjectSettings,
  deps: { llm: LlmClient },
  tasks: TaskSummaryItem[] = [],
): Promise<NextTask[]> {
  const customPrompt = settings.ai.nextTaskPrompt.trim();
  if (!customPrompt) return [];

  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const taskContext = JSON.stringify(
    {
      inProgress: inProgressTasks.map((t) => ({ seq: t.seq, title: t.title })),
      pending: pendingTasks.map((t) => ({ seq: t.seq, title: t.title })),
      recentlyDone: doneTasks.slice(0, 3).map((t) => ({ seq: t.seq, title: t.title })),
    },
    null,
    2,
  );

  const prompt = `
당신은 AI 코딩 에이전트 활동 분석 전문가예요.
${customPrompt}

현재 태스크 현황:
${taskContext}

위 지침과 태스크 현황을 바탕으로 다음 작업을 **1~3개** 제안해주세요.
반드시 아래 JSON 형식만 반환하세요:
{
  "tasks": [
    {
      "title": "작업 제목 (간결하게)",
      "reason": "이 작업을 추천하는 이유",
      "priority": "critical" | "high" | "medium" | "low",
      "agentCommand": "AI 에이전트에게 전달할 구체적인 실행 지시 프롬프트"
    }
  ]
}
`.trim();

  const text = await deps.llm.complete({
    system: "출력은 반드시 지정된 JSON 형식만 반환하세요. 다른 텍스트 금지.",
    prompt,
    maxTokens: 1024,
  });

  return parseTasks(text);
}

function parseTasks(text: string): NextTask[] {
  const cleaned = stripCodeFence(text).trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return [];
  return parsed.tasks.filter(isNextTask).slice(0, 3);
}

function isNextTask(v: unknown): v is NextTask {
  if (!isRecord(v)) return false;
  return (
    typeof v.title === "string" &&
    typeof v.reason === "string" &&
    (v.priority === "critical" || v.priority === "high" || v.priority === "medium" || v.priority === "low") &&
    typeof v.agentCommand === "string"
  );
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
