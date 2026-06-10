import { NextResponse } from "next/server";

import type { ToolSuggestion } from "@/domain/memory/memoryTierTypes";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const access = await assertApiKeyProjectAccess(user.id, projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const [latestReflection, existingCommands] = await Promise.all([
    prisma.projectMemoryReflection.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { toolSuggestions: true },
    }),
    prismaCommandRepository.listByUser(user.id),
  ]);

  if (!latestReflection) {
    return NextResponse.json({ ok: true, suggestions: [], count: 0 });
  }

  const raw = (latestReflection.toolSuggestions as ToolSuggestion[]) ?? [];
  const existingNames = new Set(existingCommands.map((c) => c.name.toLowerCase()));
  const pending = raw.filter((s) => !existingNames.has(s.name.toLowerCase()));

  return NextResponse.json({ ok: true, suggestions: pending, count: pending.length });
}
