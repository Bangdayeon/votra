import "server-only";

import type { ReflectionEngine, ReflectionInput, ReflectionOutput } from "@/application/runMemoryReflection";
import type { LlmClient } from "@/application/ports/llmClient";

const SYSTEM = `당신은 소프트웨어 프로젝트의 AI 기억 분석 전문가입니다.
주어진 완료된 태스크 목록을 분석하여 프로젝트의 패턴, 인사이트, 위험 요소를 파악하고,
다음에 집중해야 할 작업과 재사용 가능한 스킬을 추천합니다.

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "insights": [
    { "type": "pattern" | "insight" | "risk", "text": "한국어 설명" }
  ],
  "suggestedTasks": [
    { "title": "태스크 제목", "reason": "이유", "priority": "high" | "medium" | "low" }
  ],
  "skillSuggestions": [
    {
      "name": "스킬 이름",
      "description": "한 줄 설명",
      "folder": "폴더명 (예: 리팩토링, 테스트, 배포, API연동)",
      "content": "## 스킬 지침\n에이전트가 바로 따를 수 있는 단계별 마크다운 지침 (500자 이내)",
      "patternSummary": "이 패턴이 3회 이상 반복된 근거 (태스크 번호 포함)",
      "contextHint": "이 스킬을 사용해야 하는 상황을 한 문장으로 (예: 외부 API 연동 태스크 시작 전에 사용)"
    }
  ],
  "contextSummary": "이 프로젝트의 현재 상태와 핵심 맥락을 2-3문장으로 요약"
}

분석 기준:
- pattern: 반복되는 작업 패턴이나 기술적 경향
- insight: 프로젝트 진행에서 발견된 중요한 사실
- risk: 주의가 필요한 기술적 부채나 위험 요소
- 인사이트는 3-5개, 추천 태스크는 1-3개로 제한
- 이미 진행 중이거나 대기 중인 태스크와 겹치지 않는 새로운 작업만 추천
- skillSuggestions: 동일한 작업 패턴이 3회 이상 반복된 경우에만 최대 2개 제안. 없으면 빈 배열 []. content는 에이전트가 바로 활용할 수 있는 구체적인 지침으로 작성.`;

export function createGeminiReflectionEngine(llm: LlmClient): ReflectionEngine {
  return {
    async analyze(input: ReflectionInput): Promise<ReflectionOutput> {
      const taskList = input.tasks
        .slice(0, 60)
        .map((t) => {
          const decisions = t.keyDecisions.length > 0
            ? `  결정: ${t.keyDecisions.join(" / ")}`
            : "";
          const outcome = t.outcome ? `  결과: ${t.outcome.slice(0, 200)}` : "";
          return `[#${t.seq}] ${t.title} (우선순위: ${t.priority})${decisions}${outcome}`;
        })
        .join("\n");

      const activeTasks = input.activeTasks
        .slice(0, 20)
        .map((t) => `- #${t.seq} ${t.title}`)
        .join("\n");

      const prompt = `## 완료된 태스크 (${input.tasks.length}개)
${taskList}

## 현재 진행/대기 중인 태스크
${activeTasks || "(없음)"}

## 이전 컨텍스트 요약
${input.previousContextSummary ?? "(없음)"}

위 정보를 바탕으로 프로젝트 메모리를 분석해 주세요. 특히 3회 이상 반복된 작업 패턴이 있다면 skillSuggestions에 포함해 주세요.`;

      const raw = await llm.complete({ system: SYSTEM, prompt, maxTokens: 2048 });

      let parsed: ReflectionOutput;
      try {
        parsed = JSON.parse(raw) as ReflectionOutput;
      } catch {
        parsed = { insights: [], suggestedTasks: [], skillSuggestions: [], contextSummary: null };
      }

      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : [],
        skillSuggestions: Array.isArray(parsed.skillSuggestions) ? parsed.skillSuggestions : [],
        contextSummary: typeof parsed.contextSummary === "string" ? parsed.contextSummary : null,
      };
    },
  };
}
