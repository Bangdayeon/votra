import { NextResponse } from "next/server";

import { recallThoughts } from "@/application/recallThoughts";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
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
  if (typeof body.query !== "string" || !body.query) {
    return NextResponse.json({ ok: false, error: "query가 필요해요." }, { status: 400 });
  }

  const limit = typeof body.limit === "number" ? body.limit : 10;
  const minSimilarity = typeof body.minSimilarity === "number" ? body.minSimilarity : undefined;

  const result = await recallThoughts(
    { query: body.query, projectId: body.projectId, userId: user.id, limit, minSimilarity },
    deps,
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, results: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
