import { buildSession } from "@/domain/session/buildSession";
import type { ContentBlock, RawEvent } from "@/domain/session/types";

import type { AgentAdapter, FolderFile } from "./types";

const ANTIGRAVITY_PATH_HINT =
  /(^|\/)\.gemini\/antigravity-cli\/brain\/([^/]+)\/.system_generated\/logs\/transcript\.jsonl$/i;

export function isAntigravityTranscript(file: FolderFile): boolean {
  return ANTIGRAVITY_PATH_HINT.test(file.relativePath);
}

export const antigravityAdapter: AgentAdapter = {
  kind: "ANTIGRAVITY",
  label: "Antigravity",
  detect(files) {
    return files.some(isAntigravityTranscript);
  },
  async parse(files) {
    const sessions = [];
    for (const file of files.filter(isAntigravityTranscript)) {
      const text = await file.readText();
      const session = parseAntigravityTranscript(text, file.relativePath);
      if (session) sessions.push(session);
    }
    return sessions;
  },
};

function parseAntigravityTranscript(text: string, relativePath: string) {
  const idMatch = ANTIGRAVITY_PATH_HINT.exec(relativePath);
  const sessionId = idMatch?.[2] ?? relativePath;

  const lines = text.split("\n");
  const { cwd, model } = extractMetaFromTranscript(lines);

  const events: RawEvent[] = [];
  let prevUuid: string | null = null;

  // session_meta 이벤트로 cwd 전달
  const metaUuid = `${sessionId}:meta`;
  events.push({ type: "session_meta", uuid: metaUuid, sessionId, cwd });
  prevUuid = metaUuid;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;

    const { source, type, created_at, content, tool_calls, step_index } = parsed as {
      source?: unknown;
      type?: unknown;
      created_at?: unknown;
      content?: unknown;
      tool_calls?: unknown;
      step_index?: unknown;
    };

    const timestamp = typeof created_at === "string" ? created_at : undefined;
    const stepIdx = typeof step_index === "number" ? step_index : 0;

    if (source === "USER_EXPLICIT") {
      const uuid = `${sessionId}:user:${stepIdx}`;
      const msgText = extractUserRequest(typeof content === "string" ? content : "");
      events.push({
        type: "user",
        uuid,
        parentUuid: prevUuid ?? undefined,
        sessionId,
        timestamp,
        cwd,
        message: { role: "user", content: msgText },
      });
      prevUuid = uuid;
    } else if (source === "MODEL" && type === "PLANNER_RESPONSE") {
      const uuid = `${sessionId}:assistant:${stepIdx}`;
      const contentBlocks: ContentBlock[] = [];

      const textContent = typeof content === "string" ? content : "";
      if (textContent) contentBlocks.push({ type: "text", text: textContent });

      if (Array.isArray(tool_calls)) {
        for (const tc of tool_calls) {
          if (!isRecord(tc) || typeof tc.name !== "string") continue;
          contentBlocks.push({
            type: "tool_use",
            id: `${tc.name}_${stepIdx}`,
            name: tc.name,
            input: isRecord(tc.args) ? tc.args : {},
          });
        }
      }

      events.push({
        type: "assistant",
        uuid,
        parentUuid: prevUuid ?? undefined,
        sessionId,
        timestamp,
        cwd,
        message: {
          role: "assistant",
          content:
            contentBlocks.length === 1 && contentBlocks[0].type === "text"
              ? (contentBlocks[0] as Extract<ContentBlock, { type: "text" }>).text
              : contentBlocks,
          model: model ?? "antigravity",
        },
      });
      prevUuid = uuid;
    }
  }

  if (events.length <= 1) return null;
  return buildSession(sessionId, events);
}

function extractMetaFromTranscript(lines: string[]): { cwd?: string; model?: string } {
  let cwd: string | undefined;
  let model: string | undefined;

  const workspacePattern = /read and write access to the following workspace[^:]*:\s*\n-\s*(\/[^\n]+)/i;
  const modelPattern = /Model Selection[`'"]*\s+(?:from\s+\S+\s+)?to\s+(.+?)(?=\.\s+[A-Z]|\n|$)/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;

    const content = typeof parsed.content === "string" ? parsed.content : "";
    if (!content) continue;

    // GENERIC 타입 content에서 workspace 추출 (JSON.parse 후 실제 \n 포함)
    if (!cwd) {
      const wsMatch = workspacePattern.exec(content);
      if (wsMatch) cwd = wsMatch[1].trim();
    }

    // tool call SearchPath/AbsolutePath에서 cwd 추출 (fallback)
    if (!cwd && Array.isArray(parsed.tool_calls)) {
      for (const tc of parsed.tool_calls as unknown[]) {
        if (!isRecord(tc) || !isRecord(tc.args)) continue;
        const sp = tc.args.SearchPath ?? tc.args.AbsolutePath;
        if (typeof sp === "string") {
          const clean = sp.replace(/^"+|"+$/g, "");
          if (clean.startsWith("/")) {
            cwd = inferProjectRoot(clean) ?? clean;
            break;
          }
        }
      }
    }

    // USER_INPUT content에서 모델명 추출
    if (!model) {
      const modelMatch = modelPattern.exec(content);
      if (modelMatch) model = modelMatch[1].trim();
    }

    if (cwd && model) break;
  }

  return { cwd, model };
}

function inferProjectRoot(absPath: string): string | undefined {
  const markers = ["/src/", "/lib/", "/app/", "/packages/", "/components/"];
  for (const marker of markers) {
    const idx = absPath.indexOf(marker);
    if (idx > 0) return absPath.slice(0, idx);
  }
  return undefined;
}

function extractUserRequest(raw: string): string {
  const m = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
  if (m) return m[1].trim();
  return raw.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
