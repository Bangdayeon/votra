import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

// GET /api/skills?projectId= — 전체 플랫폼 스킬 목록 + 프로젝트별 enabled 상태
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

  const [skills, configs] = await Promise.all([
    prisma.platformSkill.findMany({
      where: { isActive: true },
      select: { slug: true, name: true, description: true, contextHint: true },
      orderBy: { slug: "asc" },
    }),
    prisma.projectSkillConfig.findMany({
      where: { projectId },
      select: { skillSlug: true, enabled: true },
    }),
  ]);

  const configMap = new Map(configs.map((c) => [c.skillSlug, c.enabled]));

  const result = skills.map((skill) => ({
    ...skill,
    enabled: configMap.get(skill.slug) ?? true, // 기본값: 활성화
  }));

  return NextResponse.json({ ok: true, skills: result });
}
