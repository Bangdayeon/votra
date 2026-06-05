import "server-only";

import type { LlmClient } from "@/application/ports/llmClient";

export type KeyDecisionsEngine = {
  extract(input: { summary: string; outcome?: string }): Promise<string[]>;
};

const SYSTEM = `당신은 소프트웨어 태스크 완료 기록 전문가입니다.
주어진 작업 요약과 결과에서 재사용 가능한 핵심 결정 사항을 추출하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{"decisions": ["결정1", "결정2", ...]}

추출 기준:
- 다음 세션에서 참고할 만한 기술 결정
- 아키텍처나 패턴 선택의 이유
- 주의해야 할 제약이나 트레이드오프
- 3-5개, 한국어, 1문장씩`;

export function createGeminiKeyDecisionsEngine(llm: LlmClient): KeyDecisionsEngine {
  return {
    async extract({ summary, outcome }) {
      try {
        const outcomeSection = outcome ? `\n\n## 결과\n${outcome}` : "";
        const prompt = `## 작업 요약\n${summary}${outcomeSection}\n\n위 내용에서 핵심 결정 사항을 추출해 주세요.`;

        const raw = await llm.complete({ system: SYSTEM, prompt, maxTokens: 512 });
        const parsed = JSON.parse(raw) as { decisions?: unknown };
        if (!Array.isArray(parsed.decisions)) return [];
        return (parsed.decisions as unknown[])
          .filter((d): d is string => typeof d === "string")
          .slice(0, 5);
      } catch {
        return [];
      }
    },
  };
}
