import { NextResponse } from "next/server";

import { deleteFolder } from "@/application/deleteFolder";
import { updateFolder } from "@/application/updateFolder";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { folderId } = await params;

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

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "폴더 이름이 필요해요." }, { status: 400 });
  }

  const result = await updateFolder(
    { id: folderId, projectId: body.projectId, name: body.name },
    { folders: prismaTaskFolderRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(body.projectId);
  return NextResponse.json({ ok: true, folder: result.value });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { folderId } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const deleteAccess = await assertApiKeyProjectAccess(user.id, projectId);
  if (!deleteAccess.ok) return NextResponse.json({ ok: false, error: deleteAccess.error }, { status: 403 });

  const result = await deleteFolder(folderId, projectId, { folders: prismaTaskFolderRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(projectId);
  return NextResponse.json({ ok: true });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
