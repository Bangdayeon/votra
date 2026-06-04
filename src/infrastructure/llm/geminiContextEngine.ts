import "server-only";

import type { ContextEngine } from "@/application/learnAndUpdateContext";
import type { LlmClient } from "@/application/ports/llmClient";

const SYSTEM = `당신은 소프트웨어 프로젝트의 자기학습 AI 메모리 시스템입니다.
완료된 태스크들을 분석해 프로젝트 맥락을 이해하고, plain text로 축적합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "context": "프로젝트의 기술 결정, 아키텍처 패턴, 핵심 인사이트, 제약사항을 담은 평문 (한국어, 200-800자)",
  "longTermSeqs": [장기 보존이 필요한 태스크 seq 번호 배열 (정수, 최대 10개)]
}

맥락 작성 기준:
- 이전 맥락이 있으면 기반으로 확장·수정 (완전히 덮어쓰지 말 것)
- 기술 스택, 아키텍처 결정, 반복 패턴, 핵심 제약, 주요 마일스톤 포함
장기 보존 선정 기준: 우선순위 7 이상, 핵심 결정 포함, 구조적으로 중요한 태스크`;

export function createGeminiContextEngine(llm: LlmClient): ContextEngine {
  return {
    async learn({ tasks, previousContext }) {
      const taskList = tasks
        .slice(0, 60)
        .map((t) => {
          const decisions = t.keyDecisions.length > 0
            ? `\n  결정: ${t.keyDecisions.join(" / ")}`
            : "";
          const outcome = t.outcome ? `\n  결과: ${t.outcome.slice(0, 150)}` : "";
          return `[#${t.seq} 우선순위:${t.priority}] ${t.title}${decisions}${outcome}`;
        })
        .join("\n");

      const prompt = `## 이전 프로젝트 맥락
${previousContext ?? "(없음 — 첫 학습)"}

## 완료된 태스크 (${tasks.length}개)
${taskList}

위 정보를 바탕으로 프로젝트 맥락을 학습하고 업데이트하세요.`;

      const raw = await llm.complete({ system: SYSTEM, prompt, maxTokens: 2048 });

      let parsed: { context?: string; longTermSeqs?: unknown };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        parsed = {};
      }

      return {
        updatedContext:
          typeof parsed.context === "string" && parsed.context.trim()
            ? parsed.context
            : (previousContext ?? ""),
        longTermCandidateSeqs:
          Array.isArray(parsed.longTermSeqs)
            ? (parsed.longTermSeqs as unknown[]).filter((n): n is number => typeof n === "number")
            : [],
      };
    },
  };
}
