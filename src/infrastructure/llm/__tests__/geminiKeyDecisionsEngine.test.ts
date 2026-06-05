import { describe, expect, it, vi } from "vitest";

import type { LlmClient } from "@/application/ports/llmClient";
import { createGeminiKeyDecisionsEngine } from "@/infrastructure/llm/geminiKeyDecisionsEngine";

function makeLlm(response: string): LlmClient {
  return { complete: vi.fn().mockResolvedValue(response) };
}

describe("geminiKeyDecisionsEngine", () => {
  it("summary와 outcome을 받아 keyDecisions 배열을 추출한다", async () => {
    const llm = makeLlm(JSON.stringify({ decisions: ["Prisma 마이그레이션 적용", "레포지토리 패턴 도입"] }));
    const engine = createGeminiKeyDecisionsEngine(llm);

    const result = await engine.extract({
      summary: "DB 스키마 변경 작업 완료",
      outcome: "Task 모델에 memoryTier 컬럼 추가, prismaTaskRepository 업데이트",
    });

    expect(result).toEqual(["Prisma 마이그레이션 적용", "레포지토리 패턴 도입"]);
  });

  it("outcome이 없어도 summary만으로 추출한다", async () => {
    const llm = makeLlm(JSON.stringify({ decisions: ["컴포넌트 분리"] }));
    const engine = createGeminiKeyDecisionsEngine(llm);

    const result = await engine.extract({ summary: "UI 리팩토링 완료" });

    expect(result).toEqual(["컴포넌트 분리"]);
  });

  it("LLM이 잘못된 JSON을 반환하면 빈 배열을 반환한다", async () => {
    const llm = makeLlm("잘못된 응답");
    const engine = createGeminiKeyDecisionsEngine(llm);

    const result = await engine.extract({ summary: "작업 완료", outcome: "결과" });

    expect(result).toEqual([]);
  });

  it("LLM 호출이 실패하면 빈 배열을 반환한다", async () => {
    const llm: LlmClient = { complete: vi.fn().mockRejectedValue(new Error("API 오류")) };
    const engine = createGeminiKeyDecisionsEngine(llm);

    const result = await engine.extract({ summary: "작업 완료" });

    expect(result).toEqual([]);
  });
});
