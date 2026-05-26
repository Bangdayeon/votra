import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

type Params = { params: Promise<{ slug: string }> };

// GET /api/skills/:slug?projectId= — 스킬 content 반환 (enabled 체크)
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

  const skill = await prisma.platformSkill.findUnique({
    where: { slug },
    select: { slug: true, name: true, contextHint: true, content: true, isActive: true },
  });

  if (!skill || !skill.isActive) {
    return NextResponse.json({ ok: false, error: "스킬을 찾을 수 없어요." }, { status: 404 });
  }

  // 프로젝트별 enabled 상태 확인 (기본: 활성화)
  const config = await prisma.projectSkillConfig.findUnique({
    where: { projectId_skillSlug: { projectId, skillSlug: slug } },
  });
  const enabled = config?.enabled ?? true;

  if (!enabled) {
    return NextResponse.json({ ok: false, error: "이 프로젝트에서 비활성화된 스킬이에요." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    slug: skill.slug,
    name: skill.name,
    contextHint: skill.contextHint,
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

  const skill = await prisma.platformSkill.findUnique({ where: { slug }, select: { slug: true } });
  if (!skill) {
    return NextResponse.json({ ok: false, error: "스킬을 찾을 수 없어요." }, { status: 404 });
  }

  await prisma.projectSkillConfig.upsert({
    where: { projectId_skillSlug: { projectId, skillSlug: slug } },
    create: { projectId, skillSlug: slug, enabled: body.enabled },
    update: { enabled: body.enabled },
  });

  return NextResponse.json({ ok: true, slug, enabled: body.enabled });
}
