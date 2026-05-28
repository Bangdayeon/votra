import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

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
  if (typeof summary !== "string" || !summary) {
    return NextResponse.json({ ok: false, error: "summary가 필요해요." }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  const sessionLog = await prisma.sessionLog.upsert({
    where: {
      projectId_sessionId: {
        projectId,
        sessionId: typeof sessionId === "string" ? sessionId : "default",
      },
    },
    create: {
      projectId,
      userId: user.id,
      summary,
      aiTool: typeof aiTool === "string" ? aiTool : "unknown",
      sessionId: typeof sessionId === "string" ? sessionId : null,
    },
    update: {
      summary,
      aiTool: typeof aiTool === "string" ? aiTool : "unknown",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, sessionLog: { id: sessionLog.id } });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
