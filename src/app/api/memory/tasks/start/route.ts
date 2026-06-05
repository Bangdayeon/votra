import { NextResponse } from "next/server";

import { startTask } from "@/application/startTask";
import { matchToolsToTask } from "@/domain/memory/matchToolsToTask";
import { suggestFolder } from "@/domain/memory/suggestFolder";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
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

  if (!isRecord(body)) return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }
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

  const result = await startTask(
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

  const allTools = await prismaToolRepository.listByProject(body.projectId);
  const enabledTools = allTools.filter((t) => t.isEnabled);
  const matchedSkills = matchToolsToTask(
    { title: result.value.title, tool: result.value.tool },
    enabledTools,
  ).map((t) => ({ slug: t.slug, name: t.name, contextHint: t.contextHint }));

  return NextResponse.json({ ok: true, task: result.value, matchedSkills, suggestedFolder });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
