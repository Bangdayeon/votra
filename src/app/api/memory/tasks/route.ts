import { NextResponse } from "next/server";

import { addTask } from "@/application/addTask";
import { listTasks } from "@/application/listTasks";
import { suggestFolder } from "@/domain/memory/suggestFolder";
import type { TaskStatusValue } from "@/domain/memory/types";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

const VALID_STATUSES: TaskStatusValue[] = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"];

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

  const access = await assertApiKeyProjectAccess(user.id, body.projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  if (typeof body.title !== "string" || !body.title) {
    return NextResponse.json({ ok: false, error: "title이 필요해요." }, { status: 400 });
  }

  let resolvedFolderId: string | undefined =
    typeof body.folderId === "string" && body.folderId ? body.folderId : undefined;
  let suggestedFolder: { id: string; name: string } | null = null;

  if (!resolvedFolderId) {
    try {
      const folders = await prismaTaskFolderRepository.listByProject(body.projectId);
      const suggested = suggestFolder(
        { title: body.title, module: typeof body.tool === "string" ? body.tool : null },
        folders,
      );
      if (suggested) {
        resolvedFolderId = suggested;
        suggestedFolder = folders.find((f) => f.id === suggested) ?? null;
      }
    } catch { /* best-effort */ }
  }

  const result = await addTask(
    {
      title: body.title,
      description: typeof body.description === "string" ? body.description : undefined,
      tool: typeof body.tool === "string" ? body.tool : undefined,
      priority: typeof body.priority === "number" ? body.priority : undefined,
      folderId: resolvedFolderId,
      projectId: body.projectId,
      userId: user.id,
    },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  emitProjectUpdate(body.projectId);
  return NextResponse.json({ ok: true, task: result.value, suggestedFolder });
}

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const getAccess = await assertApiKeyProjectAccess(user.id, projectId);
  if (!getAccess.ok) return NextResponse.json({ ok: false, error: getAccess.error }, { status: 403 });

  const statusParam = searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as TaskStatusValue)
      ? (statusParam as TaskStatusValue)
      : undefined;

  const toolFilter = searchParams.get("tool") ?? undefined;

  const result = await listTasks(
    { projectId, userId: user.id, status, tool: toolFilter },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, tasks: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
