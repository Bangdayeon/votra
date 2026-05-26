import { NextResponse } from "next/server";

import { finishTask } from "@/application/finishTask";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { taskId } = await params;
  const seq = parseInt(taskId, 10);
  if (isNaN(seq) || seq <= 0) {
    return NextResponse.json({ ok: false, error: "taskId는 양의 정수(seq 번호)여야 해요." }, { status: 400 });
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
  const keyDecisions = Array.isArray(body.keyDecisions)
    ? (body.keyDecisions as unknown[]).filter((d): d is string => typeof d === "string")
    : undefined;
  const outcome = typeof body.outcome === "string" && body.outcome ? body.outcome : undefined;

  const result = await finishTask(
    { seq, userId: user.id, projectId: body.projectId, summary: body.summary, aiTool, keyDecisions, outcome },
    { tasks: prismaTaskRepository, sessionLogs: prismaSessionLogRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(body.projectId);
  return NextResponse.json({ ok: true, task: result.value.task, sessionLog: result.value.sessionLog });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
