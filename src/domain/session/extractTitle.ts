import type { ContentBlock, RawEvent } from "./types";

const TITLE_MAX_LENGTH = 40;
const WRAPPED_PROMPT_PREFIX = "<";

export function extractTitle(events: RawEvent[]): string {
  // Claude Code 는 같은 sessionId 로 ai-title 을 여러 번 emit 해요. 마지막 게 최신.
  // ai-title 은 이미 짧은 generated title 이라 slice 안 함 (tooltip 에서 풀로 보여줘야 함).
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "ai-title" && typeof e.aiTitle === "string" && e.aiTitle) {
      return e.aiTitle;
    }
  }

  const summary = events.find((e) => e.type === "summary" && typeof e.summary === "string");
  if (summary?.summary) {
    return summary.summary.slice(0, TITLE_MAX_LENGTH);
  }

  for (const event of events) {
    if (event.type !== "user") continue;
    const text = extractUserText(event);
    if (text && !text.startsWith(WRAPPED_PROMPT_PREFIX)) {
      return text.slice(0, TITLE_MAX_LENGTH);
    }
  }

  return "(제목 없음)";
}

function extractUserText(event: RawEvent): string | null {
  const content = event.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return null;
  const textBlock = content.find(isTextBlock);
  return textBlock ? textBlock.text.trim() : null;
}

function isTextBlock(block: ContentBlock): block is Extract<ContentBlock, { type: "text" }> {
  return block.type === "text";
}
