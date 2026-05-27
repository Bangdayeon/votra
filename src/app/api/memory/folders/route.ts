import { NextResponse } from "next/server";

import { createFolder } from "@/application/createFolder";
import { listFolders } from "@/application/listFolders";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const result = await listFolders(projectId, { folders: prismaTaskFolderRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, folders: result.value });
}

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
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "폴더 이름이 필요해요." }, { status: 400 });
  }

  const result = await createFolder(
    { name: body.name, projectId: body.projectId, userId: user.id },
    { folders: prismaTaskFolderRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  emitProjectUpdate(body.projectId);
  return NextResponse.json({ ok: true, folder: result.value }, { status: 201 });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
