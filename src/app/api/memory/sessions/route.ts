import { NextResponse } from "next/server";

import { listSessionLogs } from "@/application/listSessionLogs";
import { logSession } from "@/application/logSession";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";

const deps = { sessionLogs: prismaSessionLogRepository };

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
  if (typeof body.summary !== "string" || !body.summary) {
    return NextResponse.json({ ok: false, error: "summary가 필요해요." }, { status: 400 });
  }
  const aiTool = typeof body.aiTool === "string" && body.aiTool ? body.aiTool : "unknown";

  const result = await logSession(
    { summary: body.summary, aiTool, projectId: body.projectId, userId: user.id },
    deps,
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, sessionLog: result.value });
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

  const result = await listSessionLogs({ projectId, userId: user.id, limit }, deps);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, sessionLogs: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
