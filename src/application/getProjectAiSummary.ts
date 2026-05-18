import type { ProjectMetrics } from "@/application/getProjectMetrics";
import type { LlmClient } from "@/application/ports/llmClient";

export type ProjectAiSummary = {
  summary: string;
  solution: string;
};

const SYSTEM_PROMPT = `당신은 Claude Code 사용 데이터를 분석해 한국어로 짧게 요약하는 어시스턴트예요.
입력은 한 프로젝트의 세션 메트릭 (세션별 토큰, 모델 사용량, 에러 유형 분포) 이에요.

출력은 반드시 다음 JSON 형식만 반환해요. 다른 텍스트 절대 금지.
{
  "summary": "<프로젝트 사용 패턴 2~3문장 요약>",
  "solution": "<개선 제안 또는 다음 액션 2~3문장>"
}

규칙:
- 한국어로 작성. 친절하고 간결한 톤.
- 데이터가 비어 있으면 "아직 분석할 데이터가 부족해요" 류로 솔직하게 답해요.
- 추측은 금지. 입력 데이터에 근거해 작성해요.`;

export async function getProjectAiSummary(
  metrics: ProjectMetrics,
  deps: { llm: LlmClient },
): Promise<ProjectAiSummary> {
  const payload = {
    totals: metrics.totals,
    topSessions: [...metrics.sessions]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5)
      .map((s) => ({
        title: s.title,
        model: s.model,
        totalTokens: s.totalTokens,
      })),
    byModel: metrics.byModel,
    byErrorType: metrics.byErrorType,
  };

  const text = await deps.llm.complete({
    system: SYSTEM_PROMPT,
    prompt: `다음 프로젝트 메트릭을 분석해 JSON 으로만 답해주세요:\n\n${JSON.stringify(payload, null, 2)}`,
  });

  return parseJsonSummary(text);
}

function parseJsonSummary(text: string): ProjectAiSummary {
  const cleaned = stripCodeFence(text).trim();
  const parsed = JSON.parse(cleaned) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { summary?: unknown }).summary !== "string" ||
    typeof (parsed as { solution?: unknown }).solution !== "string"
  ) {
    throw new Error("AI 응답이 예상한 JSON 형식이 아니에요.");
  }
  const obj = parsed as { summary: string; solution: string };
  return { summary: obj.summary, solution: obj.solution };
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}
