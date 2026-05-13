import { aggregateSessionMetrics } from "@/domain/session/aggregateSessionMetrics";
import type { SessionScoreMetrics } from "@/domain/session/scoreSession";
import type { ContentBlock, RawEvent } from "@/domain/session/types";

/**
 * .jsonl 이벤트 배열 → scoreSession 입력 metric.
 *
 * 각 metric 정의 (heuristic — 실데이터 보면서 튜닝)
 *  - retryCount: tool_result is_error 직후 같은 tool 이 다시 호출된 횟수
 *  - editCount: Edit / Write / MultiEdit / NotebookEdit tool_use 횟수
 *  - errorCount: tool_result is_error=true 개수
 *  - rollbackCount: Bash 명령 중 git reset/revert/checkout --/restore/clean -f, branch -D 매칭
 *  - tokenUsage: assistant usage input+output 합
 *  - durationSec: 첫 ~ 마지막 timestamp 초
 *  - repeatedErrorCount: 같은 fingerprint 의 에러가 2번 이상일 때 (count - 1) 합
 *  - retryLoopDepth: 같은 tool 이 연속 실패→재호출되는 최대 깊이
 *  - branchCount: 같은 parentUuid 를 가진 자식이 2개 이상인 parent 의 수
 *  - messageCount: type 이 user / assistant 인 event 수
 */
export function extractScoreMetrics(events: RawEvent[]): SessionScoreMetrics {
  const blocks = flattenBlocks(events);
  const { retryCount, retryLoopDepth } = countRetries(blocks);

  return {
    retryCount,
    editCount: countEdits(blocks),
    errorCount: countErrors(blocks),
    rollbackCount: countRollbacks(blocks),
    tokenUsage: aggregateSessionMetrics(events).totalTokens,
    durationSec: computeDurationSec(events),
    repeatedErrorCount: countRepeatedErrors(blocks),
    retryLoopDepth,
    branchCount: countBranches(events),
    messageCount: countMessages(events),
  };
}

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

const ROLLBACK_PATTERNS = [
  /\bgit\s+reset\b/i,
  /\bgit\s+revert\b/i,
  /\bgit\s+checkout\s+--/i,
  /\bgit\s+restore\b/i,
  /\bgit\s+clean\s+-f/i,
  /\bgit\s+branch\s+-D\b/i,
];

function flattenBlocks(events: RawEvent[]): ContentBlock[] {
  const out: ContentBlock[] = [];
  for (const e of events) {
    const c = e.message?.content;
    if (Array.isArray(c)) out.push(...c);
  }
  return out;
}

function countEdits(blocks: ContentBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "tool_use" && EDIT_TOOLS.has(b.name)) n++;
  }
  return n;
}

function countErrors(blocks: ContentBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type === "tool_result" && b.is_error === true) n++;
  }
  return n;
}

function countRollbacks(blocks: ContentBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.type !== "tool_use" || b.name !== "Bash") continue;
    const cmd = extractBashCommand(b.input);
    if (cmd && ROLLBACK_PATTERNS.some((p) => p.test(cmd))) n++;
  }
  return n;
}

function extractBashCommand(input: unknown): string | null {
  if (input && typeof input === "object" && "command" in input) {
    const c = (input as { command: unknown }).command;
    return typeof c === "string" ? c : null;
  }
  return null;
}

// retry 와 retryLoopDepth 는 같은 순회로 같이 계산해서 비용 절감.
function countRetries(blocks: ContentBlock[]): {
  retryCount: number;
  retryLoopDepth: number;
} {
  const idToName = new Map<string, string>();
  for (const b of blocks) {
    if (b.type === "tool_use") idToName.set(b.id, b.name);
  }

  let retryCount = 0;
  let currentLoop = 0;
  let maxLoop = 0;
  let lastFailedTool: string | null = null;

  for (const b of blocks) {
    if (b.type === "tool_result") {
      if (b.is_error === true) {
        lastFailedTool = idToName.get(b.tool_use_id) ?? null;
      } else {
        // 성공이 끼면 chain 끊김
        lastFailedTool = null;
        currentLoop = 0;
      }
    } else if (b.type === "tool_use") {
      if (lastFailedTool && b.name === lastFailedTool) {
        retryCount++;
        currentLoop++;
        if (currentLoop > maxLoop) maxLoop = currentLoop;
      } else {
        currentLoop = 0;
      }
      lastFailedTool = null;
    }
  }

  return { retryCount, retryLoopDepth: maxLoop };
}

function countRepeatedErrors(blocks: ContentBlock[]): number {
  const counts = new Map<string, number>();
  for (const b of blocks) {
    if (b.type !== "tool_result" || b.is_error !== true) continue;
    const key = fingerprintError(b.content);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let repeated = 0;
  for (const c of counts.values()) {
    if (c >= 2) repeated += c - 1;
  }
  return repeated;
}

// 숫자·경로·hex 같은 가변 부분을 마스킹해서 "같은 에러" 판별 키로 씀.
function fingerprintError(content: unknown): string | null {
  const text = extractResultText(content);
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/0x[0-9a-f]+/g, "X")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function extractResultText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") parts.push(item);
    else if (
      item &&
      typeof item === "object" &&
      "text" in item &&
      typeof (item as { text: unknown }).text === "string"
    ) {
      parts.push((item as { text: string }).text);
    }
  }
  const joined = parts.join(" ").trim();
  return joined.length > 0 ? joined : null;
}

function computeDurationSec(events: RawEvent[]): number {
  let first: number | null = null;
  let last: number | null = null;
  for (const e of events) {
    if (!e.timestamp) continue;
    const t = Date.parse(e.timestamp);
    if (Number.isNaN(t)) continue;
    if (first === null || t < first) first = t;
    if (last === null || t > last) last = t;
  }
  if (first === null || last === null) return 0;
  return Math.max(0, Math.round((last - first) / 1000));
}

function countBranches(events: RawEvent[]): number {
  const childrenByParent = new Map<string, number>();
  for (const e of events) {
    if (!e.parentUuid) continue;
    childrenByParent.set(
      e.parentUuid,
      (childrenByParent.get(e.parentUuid) ?? 0) + 1,
    );
  }
  let branches = 0;
  for (const c of childrenByParent.values()) {
    if (c >= 2) branches++;
  }
  return branches;
}

function countMessages(events: RawEvent[]): number {
  let n = 0;
  for (const e of events) {
    if (e.type === "user" || e.type === "assistant") n++;
  }
  return n;
}
