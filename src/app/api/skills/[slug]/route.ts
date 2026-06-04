import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

type Params = { params: Promise<{ slug: string }> };

// GET /api/skills/:slug?projectId= — 스킬 content 반환
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

  const skill = await prisma.projectCustomSkill.findUnique({
    where: { projectId_slug: { projectId, slug } },
  });

  if (!skill || !skill.isEnabled) {
    return NextResponse.json({ ok: false, error: "스킬을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    slug: skill.slug,
    name: skill.name,
    contextHint: skill.contextHint ?? skill.description,
    content: skill.content,
  });
}

// PATCH /api/skills/:slug?projectId= — { enabled: boolean } 토글
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

  const existing = await prisma.projectCustomSkill.findUnique({
    where: { projectId_slug: { projectId, slug } },
    select: { slug: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "스킬을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.projectCustomSkill.update({
    where: { projectId_slug: { projectId, slug } },
    data: { isEnabled: body.enabled as boolean },
  });

  return NextResponse.json({ ok: true, slug, enabled: body.enabled });
}
