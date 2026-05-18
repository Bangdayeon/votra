import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { projectMetricsTag } from "@/app/actions/projectMetricsTag";
import {
  ingestSessionEvents,
  type IngestSessionPayload,
} from "@/application/ingestSessionEvents";
import type { RawEvent } from "@/domain/session/types";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON 파싱에 실패했어요." },
      { status: 400 },
    );
  }

  const parsed = parseIngestBody(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 },
    );
  }

  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "API 키가 없거나 유효하지 않아요. Authorization: Bearer <key> 헤더를 확인해 주세요.",
      },
      { status: 401 },
    );
  }

  const result = await ingestSessionEvents(
    { source: parsed.source, sessions: parsed.sessions, userId: user.id },
    { projects: prismaProjectRepository },
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }

  if (result.value.insertedEvents > 0) {
    revalidateTag(projectMetricsTag(result.value.projectId));
  }

  return NextResponse.json({
    ok: true,
    projectId: result.value.projectId,
    insertedEvents: result.value.insertedEvents,
    sessions: result.value.sessions,
  });
}

type ParsedBody =
  | { ok: true; source: string; sessions: IngestSessionPayload[] }
  | { ok: false; error: string };

function parseIngestBody(raw: unknown): ParsedBody {
  if (!isRecord(raw)) return { ok: false, error: "body 가 객체가 아니에요." };
  const source = raw.source;
  if (typeof source !== "string" || source.length === 0) {
    return { ok: false, error: "source 가 비어 있어요." };
  }
  const sessionsRaw = raw.sessions;
  if (!Array.isArray(sessionsRaw)) {
    return { ok: false, error: "sessions 가 배열이 아니에요." };
  }
  const sessions: IngestSessionPayload[] = [];
  for (let i = 0; i < sessionsRaw.length; i++) {
    const parsed = parseSession(sessionsRaw[i]);
    if (!parsed.ok) {
      return { ok: false, error: `sessions[${i}]: ${parsed.error}` };
    }
    sessions.push(parsed.value);
  }
  return { ok: true, source, sessions };
}

type ParsedSession =
  | { ok: true; value: IngestSessionPayload }
  | { ok: false; error: string };

function parseSession(raw: unknown): ParsedSession {
  if (!isRecord(raw)) return { ok: false, error: "객체가 아니에요." };
  const id = raw.id;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "id 가 비어 있어요." };
  }
  const events = raw.events;
  if (!Array.isArray(events)) {
    return { ok: false, error: "events 가 배열이 아니에요." };
  }
  const rawEvents: RawEvent[] = [];
  for (const ev of events) {
    if (!isRecord(ev) || typeof ev.type !== "string") {
      return { ok: false, error: "events[*].type 누락이에요." };
    }
    rawEvents.push(ev as RawEvent);
  }
  const title = typeof raw.title === "string" ? raw.title : undefined;
  const startedAt =
    typeof raw.startedAt === "string" ? raw.startedAt : undefined;
  const endedAt = typeof raw.endedAt === "string" ? raw.endedAt : undefined;
  return {
    ok: true,
    value: { id, title, startedAt, endedAt, events: rawEvents },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
