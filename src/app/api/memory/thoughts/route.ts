import { NextResponse } from "next/server";

import { listThoughts } from "@/application/listThoughts";
import { rememberThought } from "@/application/rememberThought";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { geminiEmbeddingClient } from "@/infrastructure/llm/geminiEmbeddingClient";
import { prismaThoughtRepository } from "@/infrastructure/repositories/prismaThoughtRepository";

const deps = {
  embedding: geminiEmbeddingClient,
  thoughts: prismaThoughtRepository,
};

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }
  if (typeof body.content !== "string" || !body.content) {
    return NextResponse.json({ ok: false, error: "content가 필요해요." }, { status: 400 });
  }
  const tags = Array.isArray(body.tags) ? (body.tags as unknown[]).filter((t): t is string => typeof t === "string") : [];

  const result = await rememberThought(
    { content: body.content, tags, projectId: body.projectId, userId: user.id },
    deps,
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  emitProjectUpdate(body.projectId);
  return NextResponse.json({ ok: true, thought: result.value });
}

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const limit = Number(searchParams.get("limit") ?? "20");

  const result = await listThoughts({ projectId, userId: user.id, limit }, { thoughts: prismaThoughtRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, thoughts: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
