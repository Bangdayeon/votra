import { NextResponse } from "next/server";

import { pinTask } from "@/application/pinTask";
import { trackTaskAccess } from "@/application/trackTaskAccess";
import { updateTask } from "@/application/updateTask";
import type { TaskStatusValue } from "@/domain/memory/types";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

const VALID_STATUSES: TaskStatusValue[] = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { taskId } = await params;
  const seq = parseInt(taskId, 10);
  if (isNaN(seq) || seq <= 0) {
    return NextResponse.json({ ok: false, error: "taskId는 양의 정수(seq 번호)여야 해요." }, { status: 400 });
  }

  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const task = await prismaTaskRepository.findBySeq({ seq, projectId });
  if (!task) return NextResponse.json({ ok: false, error: "태스크를 찾을 수 없어요." }, { status: 404 });

  void trackTaskAccess(task.id, task.memoryTier, { tasks: prismaTaskRepository }).catch(() => {});
  return NextResponse.json({ ok: true, task });
}

export async function PATCH(
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

  // isPinned 핀 고정/해제
  if (typeof body.isPinned === "boolean") {
    const projectId = typeof body.projectId === "string" ? body.projectId : undefined;
    if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
    const task = await prismaTaskRepository.findBySeq({ seq, projectId });
    if (!task) return NextResponse.json({ ok: false, error: "태스크를 찾을 수 없어요." }, { status: 404 });
    await pinTask(task.id, body.isPinned, { tasks: prismaTaskRepository });
    emitProjectUpdate(projectId);
    return NextResponse.json({ ok: true });
  }

  const statusParam = typeof body.status === "string" ? body.status : undefined;
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as TaskStatusValue)
      ? (statusParam as TaskStatusValue)
      : undefined;

  if (statusParam && !status) {
    return NextResponse.json({ ok: false, error: `status 값이 유효하지 않아요: ${statusParam}` }, { status: 400 });
  }

  const result = await updateTask(
    {
      seq,
      userId: user.id,
      title: typeof body.title === "string" ? body.title : undefined,
      description:
        body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description
            : undefined,
      status,
      module:
        body.module === null
          ? null
          : typeof body.module === "string"
            ? body.module
            : undefined,
      priority: typeof body.priority === "number" ? body.priority : undefined,
      folderId:
        body.folderId === null
          ? null
          : typeof body.folderId === "string"
            ? body.folderId
            : undefined,
    },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(result.value.projectId);
  return NextResponse.json({ ok: true, task: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
