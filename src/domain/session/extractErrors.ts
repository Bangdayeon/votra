import type { ContentBlock, RawEvent, Session } from "./types";

export type SessionError = {
  /** tool 이름 (Bash, Edit, Read 등). 매칭 실패 시 "Unknown" */
  errorType: string;
  /** 결과 텍스트 일부 (500자 cap) */
  errorMessage?: string;
  /** 이벤트 timestamp (ISO) */
  occurredAt: string;
};

export function extractErrors(session: Session): SessionError[] {
  const errors: SessionError[] = [];
  const toolNameByUseId = new Map<string, string>();

  for (const event of session.events) {
    const blocks = getBlocks(event);
    if (!blocks) continue;

    for (const block of blocks) {
      if (block.type === "tool_use") {
        toolNameByUseId.set(block.id, block.name);
      } else if (block.type === "tool_result" && block.is_error === true) {
        errors.push({
          errorType: toolNameByUseId.get(block.tool_use_id) ?? "Unknown",
          errorMessage: extractResultText(block.content)?.slice(0, 500),
          occurredAt: event.timestamp ?? new Date().toISOString(),
        });
      }
    }
  }

  return errors;
}

function getBlocks(event: RawEvent): ContentBlock[] | null {
  const content = event.message?.content;
  return Array.isArray(content) ? content : null;
}

function extractResultText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") parts.push(item);
    else if (
      typeof item === "object" &&
      item !== null &&
      "text" in item &&
      typeof (item as { text: unknown }).text === "string"
    ) {
      parts.push((item as { text: string }).text);
    }
  }
  return parts.join(" ").trim() || null;
}
