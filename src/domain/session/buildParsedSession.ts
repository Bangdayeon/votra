import type { SessionEventRow } from "@/application/ports/sessionRepository";
import type { ParsedSession } from "@/domain/session/types";

type SessionInput = {
  id: string;
  title: string | null;
  startedAt: Date | null;
  events: SessionEventRow[];
};

/** SessionEventRow[] (DB 저장 이벤트)에서 파일·툴·에러 수준의 세분화 데이터를 추출한다. */
export function buildParsedSession(session: SessionInput): ParsedSession {
  const filesModified: string[] = [];
  const filesRead: string[] = [];
  const errors: { type: string; context: string }[] = [];
  const toolCallCounts: Record<string, number> = {};
  let intentHint = "";
  let isComplete = false;

  for (const event of session.events) {
    if (event.type === "FILE_EDIT") {
      const path = readStr(event.metadata, "path");
      if (path) filesModified.push(path);
    } else if (event.type === "TOOL_CALL") {
      const toolName = readStr(event.metadata, "toolName") ?? "Unknown";
      toolCallCounts[toolName] = (toolCallCounts[toolName] ?? 0) + 1;
      if (toolName === "Read") {
        const path = readToolInputPath(event.metadata);
        if (path) filesRead.push(path);
      }
    } else if (event.type === "ERROR") {
      const type = readStr(event.metadata, "errorType") ?? "Unknown";
      const context = event.content?.slice(0, 200) ?? "";
      errors.push({ type, context });
    } else if (event.type === "ASSISTANT" && !intentHint) {
      intentHint = event.content?.slice(0, 200) ?? "";
    }
  }

  if (session.events.length > 0) {
    isComplete = session.events[session.events.length - 1].type === "ASSISTANT";
  }

  return {
    sessionId: session.id,
    title: session.title ?? "",
    startedAt: session.startedAt ?? new Date(0),
    filesModified,
    filesRead,
    errors,
    toolCallCounts,
    intentHint,
    isComplete,
  };
}

function readStr(metadata: Record<string, unknown> | null, key: string): string | null {
  if (!metadata) return null;
  const v = metadata[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readToolInputPath(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const input = metadata.toolInput;
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;
  const path = obj.file_path ?? obj.path ?? obj.notebook_path;
  return typeof path === "string" && path.length > 0 ? path : null;
}
