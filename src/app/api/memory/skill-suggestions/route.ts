import { NextResponse } from "next/server";

import type { SkillSuggestion } from "@/domain/memory/memoryTierTypes";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const [latestReflection, existingSkills] = await Promise.all([
    prisma.projectMemoryReflection.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { skillSuggestions: true },
    }),
    prisma.projectCustomSkill.findMany({
      where: { projectId },
      select: { name: true },
    }),
  ]);

  if (!latestReflection) {
    return NextResponse.json({ ok: true, suggestions: [], count: 0 });
  }

  const raw = (latestReflection.skillSuggestions as SkillSuggestion[]) ?? [];
  const existingNames = new Set(existingSkills.map((s) => s.name.toLowerCase()));
  const pending = raw.filter((s) => !existingNames.has(s.name.toLowerCase()));

  return NextResponse.json({ ok: true, suggestions: pending, count: pending.length });
}
