import type { ProjectEventCreate } from "@/application/ports/projectRepository";
import type { ContentBlock, RawEvent, Session } from "@/domain/session/types";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const CONTENT_CAP = 240;

/**
 * Session.events 를 detail 그래프용 timeline 으로 평탄화.
 * - rawEvent.uuid 를 첫 sub-event 의 uuid 로 사용 (부모 event 가 fork 감지에 사용).
 * - 한 rawEvent 안에서 ASSISTANT/TOOL_CALL/FILE_EDIT/ERROR 등이 여러 개면
 *   합성 uuid (`{base}:{idx}`) 로 linear chain (sibling 분기 X).
 * - 분기는 **rawEvent 단위** 에서만 발생 (서로 다른 rawEvent 가 같은 parentUuid 를 가질 때).
 */
export function extractTimeline(session: Session): ProjectEventCreate[] {
  const out: ProjectEventCreate[] = [];
  const toolNameByUseId = new Map<string, string>();

  for (const event of session.events) {
    const ts = parseTs(event.timestamp);
    const baseUuid = event.uuid;
    const baseParentUuid = event.parentUuid ?? undefined;

    const ctx: PushCtx = {
      out,
      ts,
      baseUuid,
      baseParentUuid,
      lastUuid: null,
      subIdx: 0,
    };

    if (event.type === "user") {
      const text = readUserText(event);
      if (text) {
        push(ctx, {
          type: "PROMPT",
          role: "user",
          content: text,
          occurredAt: ts,
        });
      }
      pushToolResultErrors(event, toolNameByUseId, ctx);
      continue;
    }
    if (event.type !== "assistant") continue;

    const blocks = getBlocks(event);
    if (!blocks) continue;
    const assistantText = readAssistantText(blocks);
    if (assistantText) {
      push(ctx, {
        type: "ASSISTANT",
        role: "assistant",
        content: cap(assistantText),
        occurredAt: ts,
      });
    }
    for (const b of blocks) {
      if (b.type !== "tool_use") continue;
      toolNameByUseId.set(b.id, b.name);
      push(ctx, {
        type: "TOOL_CALL",
        role: "assistant",
        toolName: b.name,
        toolInput: capToolInput(b.input),
        occurredAt: ts,
      });
      if (EDIT_TOOLS.has(b.name)) {
        const path = readPath(b.input);
        if (path) {
          push(ctx, {
            type: "FILE_EDIT",
            role: "assistant",
            toolName: b.name,
            path,
            occurredAt: ts,
          });
        }
      }
    }
  }
  return out;
}

type PushCtx = {
  out: ProjectEventCreate[];
  ts: Date;
  baseUuid: string | undefined;
  baseParentUuid: string | undefined;
  lastUuid: string | null;
  subIdx: number;
};

function push(
  ctx: PushCtx,
  partial: Omit<ProjectEventCreate, "uuid" | "parentUuid">,
) {
  if (!ctx.baseUuid) {
    // uuid 없으면 트리 정보 없이 그냥 추가 (graceful fallback)
    ctx.out.push(partial);
    return;
  }
  const isFirst = ctx.lastUuid === null;
  const uuid = isFirst ? ctx.baseUuid : `${ctx.baseUuid}:${ctx.subIdx}`;
  const parentUuid = isFirst ? ctx.baseParentUuid : ctx.lastUuid!;
  ctx.out.push({ ...partial, uuid, parentUuid });
  ctx.lastUuid = uuid;
  ctx.subIdx++;
}

function pushToolResultErrors(
  event: RawEvent,
  toolNameByUseId: Map<string, string>,
  ctx: PushCtx,
) {
  const blocks = getBlocks(event);
  if (!blocks) return;
  for (const b of blocks) {
    if (b.type !== "tool_result" || b.is_error !== true) continue;
    const errorType = toolNameByUseId.get(b.tool_use_id) ?? "Unknown";
    push(ctx, {
      type: "ERROR",
      role: "tool",
      errorType,
      content: cap(extractResultText(b.content) ?? ""),
      occurredAt: ctx.ts,
    });
  }
}

function getBlocks(event: RawEvent): ContentBlock[] | null {
  const c = event.message?.content;
  return Array.isArray(c) ? c : null;
}

function readUserText(event: RawEvent): string | null {
  const c = event.message?.content;
  if (typeof c === "string") return c.trim() || null;
  if (!Array.isArray(c)) return null;
  const parts: string[] = [];
  for (const b of c) {
    if (b.type === "text" && b.text) parts.push(b.text);
  }
  const joined = parts.join(" ").trim();
  return joined || null;
}

function readAssistantText(blocks: ContentBlock[]): string | null {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && b.text) parts.push(b.text);
  }
  const joined = parts.join(" ").trim();
  return joined || null;
}

function readPath(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.file_path === "string") return obj.file_path;
  if (typeof obj.notebook_path === "string") return obj.notebook_path;
  return null;
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

function parseTs(iso: string | undefined): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function cap(s: string): string {
  return s.length > CONTENT_CAP ? `${s.slice(0, CONTENT_CAP - 1)}…` : s;
}

const TOOL_INPUT_STRING_CAP = 1000;

/** tool_use.input 의 string 값을 잘라 DB metadata 크기 폭주를 방지. */
function capToolInput(input: unknown): unknown {
  if (typeof input === "string") {
    return input.length > TOOL_INPUT_STRING_CAP
      ? `${input.slice(0, TOOL_INPUT_STRING_CAP - 1)}…`
      : input;
  }
  if (Array.isArray(input)) return input.map(capToolInput);
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = capToolInput(v);
    }
    return out;
  }
  return input;
}
