import type { RawEvent } from "@/domain/session/types";

export type FileEditEvent = {
  path: string;
  toolName: string;
  occurredAt: string;
};

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/**
 * tool_use 블록 중 파일 편집 도구 호출만 뽑아 path · toolName · timestamp 로 평탄화.
 * Edit/Write/MultiEdit 은 input.file_path, NotebookEdit 은 notebook_path 또는 file_path.
 */
export function extractFileEdits(events: RawEvent[]): FileEditEvent[] {
  const out: FileEditEvent[] = [];
  for (const e of events) {
    const blocks = e.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b.type !== "tool_use" || !EDIT_TOOLS.has(b.name)) continue;
      const path = extractPath(b.input);
      if (!path) continue;
      out.push({
        path,
        toolName: b.name,
        occurredAt: e.timestamp ?? new Date().toISOString(),
      });
    }
  }
  return out;
}

function extractPath(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.file_path === "string") return obj.file_path;
  if (typeof obj.notebook_path === "string") return obj.notebook_path;
  return null;
}
