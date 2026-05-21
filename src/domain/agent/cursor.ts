import { buildSession } from "@/domain/session/buildSession";
import type { ContentBlock, RawEvent } from "@/domain/session/types";

import type { AgentAdapter, FolderFile } from "./types";

const CURSOR_PATH_HINT =
  /(^|\/)\.cursor\/projects\/[^/]+\/agent-transcripts\/([^/]+)\/[^/]+\.jsonl$/i;

export function isCursorJsonl(file: FolderFile): boolean {
  return CURSOR_PATH_HINT.test(file.relativePath);
}

export const cursorAdapter: AgentAdapter = {
  kind: "CURSOR",
  label: "Cursor",
  detect(files) {
    return files.some(isCursorJsonl);
  },
  async parse(files) {
    const sessions = [];
    for (const file of files.filter(isCursorJsonl)) {
      const text = await file.readText();
      const session = parseCursorSession(text, file.relativePath);
      if (session) sessions.push(session);
    }
    return sessions;
  },
};

function parseCursorSession(text: string, relativePath: string) {
  const idMatch = CURSOR_PATH_HINT.exec(relativePath);
  const sessionId = idMatch?.[2] ?? relativePath;

  const events: RawEvent[] = [];
  let prevUuid: string | null = null;
  let lineIndex = 0;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;

    const { role, message } = parsed as { role?: unknown; message?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (!isRecord(message)) continue;

    const rawContent = message.content;
    if (!Array.isArray(rawContent)) continue;

    const uuid = `${sessionId}:${lineIndex++}`;

    if (role === "user") {
      const first = rawContent.find((c) => isRecord(c) && c.type === "text");
      const rawText =
        isRecord(first) && typeof first.text === "string" ? first.text : "";
      events.push({
        type: "user",
        uuid,
        parentUuid: prevUuid ?? undefined,
        sessionId,
        timestamp: extractTimestamp(rawText),
        message: { role: "user", content: cleanUserText(rawText) },
      });
    } else {
      events.push({
        type: "assistant",
        uuid,
        parentUuid: prevUuid ?? undefined,
        sessionId,
        message: { role: "assistant", content: mapContentBlocks(rawContent) },
      });
    }

    prevUuid = uuid;
  }

  if (events.length === 0) return null;
  return buildSession(sessionId, events);
}

function extractTimestamp(text: string): string | undefined {
  const m = /<timestamp>([^<]+)<\/timestamp>/i.exec(text);
  if (!m) return undefined;
  const raw = m[1].replace(/\s*\(UTC[+-]\d+\)\s*$/i, "").trim();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function cleanUserText(text: string): string {
  const m = /<user_query>([\s\S]*?)<\/user_query>/i.exec(text);
  if (m) return m[1].trim();
  return text.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();
}

function mapContentBlocks(raw: unknown[]): ContentBlock[] | string {
  const blocks: ContentBlock[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (item.type === "text" && typeof item.text === "string") {
      blocks.push({ type: "text", text: item.text });
    } else if (item.type === "tool_use" && typeof item.name === "string") {
      blocks.push({
        type: "tool_use",
        id: typeof item.id === "string" ? item.id : item.name,
        name: item.name,
        input: isRecord(item.input) ? item.input : {},
      });
    }
  }
  if (blocks.length === 0) return "";
  if (blocks.length === 1 && blocks[0].type === "text")
    return (blocks[0] as Extract<ContentBlock, { type: "text" }>).text;
  return blocks;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
