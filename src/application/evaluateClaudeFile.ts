import type { LlmClient } from "@/application/ports/llmClient";
import type {
  AiScores,
  ClaudeFileSeverity,
  GlobalPolicyViolation,
} from "@/domain/claudeFiles/types";
import type { PolicyRule } from "@/domain/policy/types";

export type PolicyEvaluationInput = {
  file: { displayPath: string; content: string };
  /** Project.aiSpecGuideline — 사용자가 저장한 평가 지침 텍스트. */
  guideline: string;
  /** DB 의 PolicyRule rows — LLM 에 rubric 으로 그대로 전달. */
  rules: PolicyRule[];
  /**
   * 계정의 "전체 정책" (User.aiPolicyText + 업로드 파일 본문). 둘 다 비어 있으면 null.
   * LLM 에 별도 섹션으로 전달돼 위반 검사가 되고, 위반 시 severity 가 DANGER 로 강제 승격돼요.
   */
  globalPolicy: { text: string; fileContent: string | null } | null;
};

export type PolicyEvaluationResult = {
  severity: ClaudeFileSeverity;
  reason: string;
  scores: AiScores;
  /** 전체 정책 위반 감지 결과. 없으면 null. */
  globalPolicyViolation: GlobalPolicyViolation | null;
};

const SYSTEM_PROMPT = `당신은 AI 정책 문서(예: CLAUDE.md, AGENTS.md, SKILL.md)를 평가하는 전문가예요.
사용자가 저장한 평가 지침과 평가 항목(rubric), 그리고 계정의 "전체 정책" 을 기준으로 주어진 md 파일을 분석해 결과를 한국어로 돌려줘요.

출력은 반드시 다음 JSON 형식만 반환해요. 다른 텍스트(설명, 코드 펜스) 절대 금지.
{
  "severity": "OK" | "WARNING" | "DANGER",
  "reason": "<한국어 1~2문장: 왜 이 결과인지>",
  "scores": { "<rule.key>": <0..maxPoints 사이 정수>, ... },
  "globalPolicyViolation": null | {
    "problem": "<한 줄: 어떤 전체 정책 항목을 어떻게 위반했는지>",
    "agentCommand": "<사용자가 AI agent 에 그대로 붙여 넣어 이 md 파일을 고치게 할 한국어 명령. 한 단락 이내, 코드 펜스 금지.>"
  }
}

규칙:
- severity: 지침을 충실히 따르면 "OK", 일부 누락이면 "WARNING", 핵심 항목이 빠지거나 어긋나면 "DANGER".
  · 단, globalPolicyViolation 이 null 이 아닐 때는 무조건 "DANGER" 로 두세요.
- scores: 입력 rules 의 모든 key 를 포함하고, 각 점수는 0 이상 해당 항목의 maxPoints 이하의 정수.
- reason: 점수가 특히 낮은 항목을 짧게 언급. 두 문장 이내. 친절하고 간결하게.
- globalPolicyViolation:
  · "전체 정책" 입력이 없거나 위반이 명확하지 않으면 반드시 null.
  · 본문에 근거가 분명할 때만 위반으로 봐요. 단순히 "보강이 필요해 보임" 은 위반이 아니에요.
  · problem 은 한 줄(~80자 권장).
  · agentCommand 는 동일한 md 파일을 직접 수정하도록 "~을 추가/수정해" 형태로 적어요.
- 추측 금지. 입력된 md 본문에 근거해 평가해요. 본문이 비어 있으면 정직하게 그렇게 답해요.`;

export async function evaluateClaudeFile(
  input: PolicyEvaluationInput,
  deps: { llm: LlmClient },
): Promise<PolicyEvaluationResult> {
  const prompt = buildUserPrompt(input);
  const text = await deps.llm.complete({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 4096,
  });
  return parseResult(text, input.rules);
}

function buildUserPrompt(input: PolicyEvaluationInput): string {
  const rubric = input.rules
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      maxPoints: r.maxPoints,
    }));
  // 너무 큰 파일은 잘라서 보내요 (Gemini token 한계 + 비용 보호).
  const content = input.file.content.length > 12000
    ? input.file.content.slice(0, 12000) + "\n…(이후 생략됨)"
    : input.file.content;
  return [
    "[전체 정책 — 반드시 지켜야 함]",
    formatGlobalPolicy(input.globalPolicy),
    "",
    "[평가 지침]",
    input.guideline || "(저장된 지침 없음 — rules 만으로 평가해 주세요)",
    "",
    "[평가 항목 rubric]",
    JSON.stringify(rubric, null, 2),
    "",
    `[md 파일: ${input.file.displayPath}]`,
    "---",
    content,
    "---",
    "",
    "위 입력을 종합해 JSON 으로만 답해주세요.",
  ].join("\n");
}

function formatGlobalPolicy(
  policy: PolicyEvaluationInput["globalPolicy"],
): string {
  if (!policy) return "(전체 정책 없음 — globalPolicyViolation 은 반드시 null)";
  const parts: string[] = [];
  if (policy.text.trim().length > 0) parts.push(policy.text.trim());
  if (policy.fileContent) {
    const trimmed = policy.fileContent.trim();
    if (trimmed.length > 0) {
      const sliced =
        trimmed.length > 8000
          ? trimmed.slice(0, 8000) + "\n…(이후 생략됨)"
          : trimmed;
      parts.push("--- 업로드된 정책 파일 ---", sliced);
    }
  }
  return parts.length > 0
    ? parts.join("\n\n")
    : "(전체 정책 없음 — globalPolicyViolation 은 반드시 null)";
}

function parseResult(
  text: string,
  rules: PolicyRule[],
): PolicyEvaluationResult {
  const cleaned = stripCodeFence(text).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 1. Gemini 가 가끔 본문 문자열 안에 raw 줄바꿈/탭을 흘려서 JSON 을 깨뜨려요.
    //    string literal 안의 제어문자를 escape 한 뒤 한 번 더 시도해요.
    try {
      parsed = JSON.parse(escapeControlCharsInStrings(cleaned));
    } catch {
      // 2. maxOutputTokens 초과로 마지막 객체가 잘렸을 가능성 — 미닫힌 괄호를 메워 본 뒤 재시도.
      try {
        parsed = JSON.parse(
          escapeControlCharsInStrings(closeTruncatedJson(cleaned)),
        );
      } catch {
        const head = cleaned.slice(0, 200).replace(/\s+/g, " ");
        const tail = cleaned.slice(-120).replace(/\s+/g, " ");
        throw new Error(
          `AI 응답을 JSON 으로 해석하지 못했어요 (len=${cleaned.length}). 시작: ${head}… 끝: …${tail}`,
        );
      }
    }
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("AI 응답이 객체가 아니에요.");
  }
  const obj = parsed as Record<string, unknown>;
  const rawSeverity = obj.severity;
  if (
    rawSeverity !== "OK" &&
    rawSeverity !== "WARNING" &&
    rawSeverity !== "DANGER"
  ) {
    throw new Error("AI 응답의 severity 값이 잘못됐어요.");
  }
  let severity: ClaudeFileSeverity = rawSeverity;
  if (typeof obj.reason !== "string") {
    throw new Error("AI 응답의 reason 이 문자열이 아니에요.");
  }
  if (typeof obj.scores !== "object" || obj.scores === null) {
    throw new Error("AI 응답의 scores 가 객체가 아니에요.");
  }
  const rawScores = obj.scores as Record<string, unknown>;
  const scores: AiScores = {};
  for (const rule of rules) {
    const raw = rawScores[rule.key];
    const num = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    scores[rule.key] = Math.max(0, Math.min(rule.maxPoints, Math.round(num)));
  }
  const globalPolicyViolation = parseViolation(obj.globalPolicyViolation);
  if (globalPolicyViolation) severity = "DANGER";
  return { severity, reason: obj.reason, scores, globalPolicyViolation };
}

function parseViolation(raw: unknown): GlobalPolicyViolation | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const problem = typeof obj.problem === "string" ? obj.problem.trim() : "";
  const agentCommand =
    typeof obj.agentCommand === "string" ? obj.agentCommand.trim() : "";
  if (problem.length === 0 || agentCommand.length === 0) return null;
  return { problem, agentCommand };
}

function stripCodeFence(text: string): string {
  const m = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : text;
}

/** maxOutputTokens 로 응답이 잘려 마지막 string/object/array 가 열린 채 끝났을 때,
 *  안전한 위치까지 꼬리를 잘라내고 미닫힌 괄호를 닫아 부분 JSON 을 살려요.
 *  reason/scores 까지는 정상이고 globalPolicyViolation 만 잘리는 흔한 케이스를 처리해요.
 */
function closeTruncatedJson(input: string): string {
  let inString = false;
  let escaped = false;
  const stack: Array<"{" | "["> = [];
  let lastCompleteAt = -1;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack.length > 0) lastCompleteAt = i;
    } else if ((ch === "," || ch === " " || ch === "\n") && stack.length === 1) {
      // 최상위 객체 안에서 key/value 쌍이 막 끝난 지점을 기록.
      lastCompleteAt = i;
    }
  }
  // 미닫힌 string 이 있으면 그 직전 안전 지점까지 자르고 닫음.
  let truncated = input;
  if (inString && lastCompleteAt >= 0) {
    truncated = input.slice(0, lastCompleteAt);
  }
  // 미닫힌 괄호를 역순으로 닫음.
  const stillOpen: Array<"{" | "["> = [];
  let s = false;
  let esc = false;
  for (let i = 0; i < truncated.length; i += 1) {
    const ch = truncated[i];
    if (s) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') s = false;
      continue;
    }
    if (ch === '"') s = true;
    else if (ch === "{" || ch === "[") stillOpen.push(ch);
    else if (ch === "}" || ch === "]") stillOpen.pop();
  }
  let out = truncated.replace(/,\s*$/, "");
  while (stillOpen.length > 0) {
    const open = stillOpen.pop();
    out += open === "{" ? "}" : "]";
  }
  return out;
}

/** JSON string literal 안에 들어 있는 raw 제어문자를 \n / \t / \\uXXXX 로 escape.
 *  Gemini 가 reason 본문에 줄바꿈을 그대로 흘려보낼 때 JSON.parse 가 깨지는 걸 막아요.
 */
function escapeControlCharsInStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
      out += ch;
    } else {
      out += ch;
      if (ch === '"') inString = true;
    }
  }
  return out;
}
