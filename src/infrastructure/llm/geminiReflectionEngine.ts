import "server-only";

import type { ReflectionEngine, ReflectionInput, ReflectionOutput } from "@/application/runMemoryReflection";
import type { LlmClient } from "@/application/ports/llmClient";

const BASE_SYSTEM = `당신은 소프트웨어 프로젝트의 AI 기억 분석 전문가입니다.
주어진 완료된 태스크 목록을 분석하여 프로젝트의 패턴, 인사이트, 위험 요소를 파악하고,
다음에 집중해야 할 작업과 재사용 가능한 커맨드를 추천합니다.

응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "insights": [
    { "type": "pattern" | "insight" | "risk", "text": "한국어 설명" }
  ],
  "toolSuggestions": [
    {
      "name": "커맨드 이름",
      "description": "한 줄 설명",
      "folder": "폴더명 (예: 리팩토링, 테스트, 배포, API연동)",
      "content": "## 커맨드 지침\n에이전트가 바로 따를 수 있는 단계별 마크다운 지침 (500자 이내)",
      "patternSummary": "이 패턴이 3회 이상 반복된 근거 (태스크 번호 포함)",
      "contextHint": "이 커맨드를 사용해야 하는 상황을 한 문장으로 (예: 외부 API 연동 태스크 시작 전에 사용)",
      "hookEvent": "PreToolUse | PostToolUse | Stop | null",
      "hookMatcher": "툴 이름 (예: Edit, Bash, Write, mcp__haema-memory__finish_task) 또는 null",
      "hookScript": "#!/bin/bash\necho '⚠️ SOP: [규칙 설명]'\nexit 0"
    }
  ],
  "toolEnrichments": [
    {
      "targetToolName": "보강할 기존 툴의 정확한 이름",
      "addToContent": "기존 content 끝에 추가할 마크다운 섹션 (300자 이내)",
      "reason": "왜 이 내용이 기존 툴에 빠져 있었는지 한 문장"
    }
  ],
  "contextSummary": "이 프로젝트의 현재 상태와 핵심 맥락을 2-3문장으로 요약"
}

분석 기준:
- pattern: 반복되는 작업 패턴이나 기술적 경향
- insight: 프로젝트 진행에서 발견된 중요한 사실
- risk: 주의가 필요한 기술적 부채나 위험 요소
- 인사이트는 3-5개로 제한
- toolSuggestions vs toolEnrichments 결정 규칙:
  1. 패턴이 3회 이상 반복됐을 때만 고려.
  2. 기존 툴(아래 목록)의 domain/folder와 겹치면 → toolSuggestions 금지. 대신 기존 툴 content에 없는 내용이 있으면 toolEnrichments로 보강.
  3. 기존 툴로 전혀 커버 안 되는 완전히 새 도메인일 때만 toolSuggestions에 추가 (최대 1개).
  4. 기존 툴 content를 먼저 확인하고 이미 언급된 내용이면 toolEnrichments도 생략.
  5. 확실하지 않으면 둘 다 빈 배열 [].
- hookEvent/hookMatcher/hookScript: 기계적으로 강제할 수 있는 패턴(특정 툴 사용 전후)이면 설정하세요. PreToolUse = 툴 사용 직전 리마인더, PostToolUse = 툴 완료 후 검증, Stop = 세션 종료 전 체크. 순수 맥락/지식형 패턴이면 세 필드 모두 null. hookScript는 반드시 exit 0 (리마인더) 또는 명백한 오류 방지 시에만 exit 2 (차단). hookMatcher는 Claude Code 툴 이름 그대로 사용 (예: "Edit", "Bash", "Write").`;

export function createGeminiReflectionEngine(llm: LlmClient, instruction?: string): ReflectionEngine {
  const customPart = instruction?.trim() ? `\n\n[추가 지침]\n${instruction.trim()}` : "";
  const SYSTEM = BASE_SYSTEM + customPart;
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

      const existingToolsList = input.existingTools.length > 0
        ? input.existingTools.map((t) =>
            `### ${t.name} (${t.folder})\n설명: ${t.description}\n현재 content 요약: ${t.content.slice(0, 300)}${t.content.length > 300 ? "..." : ""}`
          ).join("\n\n")
        : "(없음)";

      const prompt = `## 완료된 태스크 (${input.tasks.length}개)
${taskList}

## 현재 진행/대기 중인 태스크
${activeTasks || "(없음)"}

## 기존 툴 목록 (중복 생성 금지 — 보강이 필요하면 toolEnrichments 사용)
${existingToolsList}

## 이전 컨텍스트 요약
${input.previousContextSummary ?? "(없음)"}

위 정보를 바탕으로 프로젝트 메모리를 분석해 주세요.
- 기존 툴 domain과 겹치는 패턴은 toolSuggestions 금지. 기존 툴에 빠진 내용이 있으면 toolEnrichments로 보강하세요.
- 완전히 새 도메인일 때만 toolSuggestions에 최대 1개 추가하세요.`;

      const raw = await llm.complete({ system: SYSTEM, prompt, maxTokens: 2048 });

      let parsed: ReflectionOutput;
      try {
        parsed = JSON.parse(raw) as ReflectionOutput;
      } catch {
        parsed = { insights: [], toolSuggestions: [], toolEnrichments: [], contextSummary: null };
      }

      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        toolSuggestions: Array.isArray(parsed.toolSuggestions) ? parsed.toolSuggestions : [],
        toolEnrichments: Array.isArray(parsed.toolEnrichments) ? parsed.toolEnrichments : [],
        contextSummary: typeof parsed.contextSummary === "string" ? parsed.contextSummary : null,
      };
    },
  };
}
