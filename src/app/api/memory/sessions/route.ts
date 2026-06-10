import { NextResponse } from "next/server";

import { createSessionLog } from "@/application/createSessionLog";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiSessionEngine } from "@/infrastructure/llm/geminiSessionEngine";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";

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

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  }

  const { projectId, summary, aiTool, sessionId } = body;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const access = await assertApiKeyProjectAccess(user.id, projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  if (typeof summary !== "string" || !summary.trim()) {
    return NextResponse.json({ ok: false, error: "summary가 필요해요." }, { status: 400 });
  }

  try {
    await createSessionLog(
      {
        projectId,
        userId: user.id,
        summary,
        aiTool: typeof aiTool === "string" ? aiTool : undefined,
        sessionId: typeof sessionId === "string" ? sessionId : undefined,
      },
      {
        sessionLogs: prismaSessionLogRepository,
        engine: createGeminiSessionEngine(geminiLlmClient),
      },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "저장 실패";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
