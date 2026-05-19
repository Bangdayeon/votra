import type { ProjectMetrics } from "@/application/getProjectMetrics";
import type { LlmClient } from "@/application/ports/llmClient";
import type { ProjectSettings } from "@/domain/project/settings/types";

export async function getProjectNextTasks(
  metrics: ProjectMetrics,
  settings: ProjectSettings,
  deps: { llm: LlmClient },
): Promise<string[]> {
  const recentSessions = [...metrics.sessions]
    .sort((a, b) => {
      if (!a.startedAt && !b.startedAt) return 0;
      if (!a.startedAt) return 1;
      if (!b.startedAt) return -1;
      return b.startedAt.localeCompare(a.startedAt);
    })
    .slice(0, 10)
    .map((s) => ({ title: s.title, model: s.model, totalTokens: s.totalTokens, startedAt: s.startedAt }));

  const customPrompt = settings.ai.nextTaskPrompt.trim();

  const prompt = `
당신은 AI 코딩 에이전트 활동 분석 전문가예요.
아래는 프로젝트의 최근 세션 데이터입니다.

## 최근 세션 목록
${JSON.stringify(recentSessions, null, 2)}

## 에러 현황
${JSON.stringify(metrics.byErrorType, null, 2)}

## 프로젝트 합계
${JSON.stringify(metrics.totals, null, 2)}
${customPrompt ? `\n## 추가 지침\n${customPrompt}` : ""}

위 데이터를 바탕으로 현재 작업 흐름을 파악하고, 가장 효율적인 다음 액션을 **1~3개** 제안해 주세요.
- 각 제안은 구체적이고 실행 가능한 한 문장이어야 해요.
- 한국어로 답변해 주세요.

반드시 아래 JSON 형식만 반환하세요:
{
  "tasks": ["제안1", "제안2", "제안3"]
}
`.trim();

  const text = await deps.llm.complete({
    system: "출력은 반드시 지정된 JSON 형식만 반환하세요. 다른 텍스트 금지.",
    prompt,
    maxTokens: 512,
  });

  return parseTasks(text);
}

function parseTasks(text: string): string[] {
  const cleaned = stripCodeFence(text).trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) return [];
  return parsed.tasks
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .slice(0, 3);
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
