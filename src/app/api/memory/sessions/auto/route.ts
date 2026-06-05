import { NextResponse } from "next/server";

import { autoLogSession } from "@/application/autoLogSession";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiSessionEngine } from "@/infrastructure/llm/geminiSessionEngine";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  }

  const { cwd, sessionId } = body as Record<string, unknown>;
  if (typeof cwd !== "string" || !cwd) {
    return NextResponse.json({ ok: false, error: "cwd가 필요해요." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { ownerId_cwd: { ownerId: user.id, cwd } },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ ok: true, logged: false, reason: "프로젝트를 찾을 수 없어요." });
  }

  const result = await autoLogSession(
    {
      projectId: project.id,
      userId: user.id,
      sessionId: typeof sessionId === "string" ? sessionId : undefined,
    },
    {
      tasks: prismaTaskRepository,
      sessionLogs: prismaSessionLogRepository,
      engine: createGeminiSessionEngine(geminiLlmClient),
    },
  );

  return NextResponse.json({ ok: true, ...result });
}
