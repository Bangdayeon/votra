import type { LlmClient } from "@/application/ports/llmClient";
import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { DEFAULT_NEXT_TASK_PROMPT } from "@/domain/project/settings/defaultNextTaskPrompt";
import type { TaskRecord } from "@/domain/memory/types";
import type { ProjectSettings } from "@/domain/project/settings/types";

export async function getProjectNextTasks(
  settings: ProjectSettings,
  deps: { llm: LlmClient },
  tasks: TaskRecord[] = [],
): Promise<NextTask[]> {
  if (tasks.length === 0) return [];

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
    },
    null,
    2,
  );

  const prompt = `
당신은 AI 프로젝트 분석가예요.
${customInstruction}

## 현재 태스크 현황
${taskContext}

## 지시사항
위 데이터를 분석해서 지금 시작하기에 가장 효과적인 작업을 **1~3개** 제안해 주세요.

반드시 아래 규칙을 따르세요:
- 단순히 대기 중 태스크를 그대로 나열하지 마세요.
- 최근 완료 작업(recentlyDone)의 outcome·keyDecisions에서 드러난 미완성 부분이나 파생 작업을 우선 분석하세요.
- 대기 중 태스크를 추천할 때는 완료 작업과의 연관성·의존 관계를 reason에 명시하세요.
- 완료 작업 패턴에서 기존 목록에 없는 새로운 작업이 필요하다면 새롭게 제안해도 됩니다.

반드시 아래 JSON 형식만 반환하세요:
{
  "tasks": [
    {
      "title": "작업 제목 (간결하게)",
      "reason": "완료 작업 분석 근거와 지금 해야 하는 이유",
      "priority": "critical" | "high" | "medium" | "low",
      "agentCommand": "AI 에이전트에 바로 붙여넣을 수 있는 구체적인 실행 지시"
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
