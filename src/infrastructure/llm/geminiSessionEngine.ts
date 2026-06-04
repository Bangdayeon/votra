import "server-only";

import type { SessionEngine } from "@/application/createSessionLog";
import type { LlmClient } from "@/application/ports/llmClient";

const SYSTEM = `당신은 AI 개발 세션 기록 전문가입니다.
주어진 세션 요약을 SOP(표준 운영 절차) 형식의 마크다운으로 재구성하세요.

반드시 다음 형식으로만 출력하세요 (JSON 아닌 마크다운 텍스트):

## 상황
[어떤 배경/맥락에서 이 작업이 시작되었는가]

## 요구사항
[무엇을 달성해야 했는가]

## 작업
[실제로 어떤 작업을 수행했는가 — 불릿 포인트로]

## 결과
[어떤 결과가 나왔는가, 남은 과제가 있으면 포함]

각 섹션은 간결하게 1-5줄로 작성하세요. 한국어로 작성하세요.`;

export function createGeminiSessionEngine(llm: LlmClient): SessionEngine {
  return {
    async structure(summary: string): Promise<string> {
      try {
        const result = await llm.complete({
          system: SYSTEM,
          prompt: `다음 세션 요약을 SOP 형식으로 재구성해 주세요:\n\n${summary}`,
          maxTokens: 1024,
        });
        return result.trim();
      } catch {
        return summary;
      }
    },
  };
}
