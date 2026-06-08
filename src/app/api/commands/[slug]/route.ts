import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const tool = await prisma.projectTool.findUnique({
    where: { projectId_slug: { projectId, slug } },
  });

  if (!tool || !tool.isEnabled) {
    return NextResponse.json({ ok: false, error: "커맨드를 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    slug: tool.slug,
    name: tool.name,
    contextHint: tool.contextHint ?? tool.description,
    content: tool.content,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled 값이 필요해요." }, { status: 400 });
  }

  const existing = await prisma.projectTool.findUnique({
    where: { projectId_slug: { projectId, slug } },
    select: { slug: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "커맨드를 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.projectTool.update({
    where: { projectId_slug: { projectId, slug } },
    data: { isEnabled: body.enabled as boolean },
  });

  return NextResponse.json({ ok: true, slug, enabled: body.enabled });
}
