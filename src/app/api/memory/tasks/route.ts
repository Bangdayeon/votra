import { NextResponse } from "next/server";

import { addTask } from "@/application/addTask";
import { listTasks } from "@/application/listTasks";
import type { TaskStatusValue } from "@/domain/memory/types";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
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
  if (typeof body.title !== "string" || !body.title) {
    return NextResponse.json({ ok: false, error: "title이 필요해요." }, { status: 400 });
  }

  const result = await addTask(
    {
      title: body.title,
      description: typeof body.description === "string" ? body.description : undefined,
      module: typeof body.module === "string" ? body.module : undefined,
      priority: typeof body.priority === "number" ? body.priority : undefined,
      projectId: body.projectId,
      userId: user.id,
    },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, task: result.value });
}

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const statusParam = searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as TaskStatusValue)
      ? (statusParam as TaskStatusValue)
      : undefined;

  const moduleFilter = searchParams.get("module") ?? undefined;

  const result = await listTasks(
    { projectId, userId: user.id, status, module: moduleFilter },
    { tasks: prismaTaskRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, tasks: result.value });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
