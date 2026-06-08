import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prisma } from "@/infrastructure/db/prisma";

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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  const tools = await prismaToolRepository.listByProject(projectId);
  const hooks = tools
    .filter((t) => t.isEnabled && t.hookEvent && t.hookMatcher && t.hookScript)
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      hookEvent: t.hookEvent!,
      hookMatcher: t.hookMatcher!,
      hookScript: t.hookScript!,
    }));

  return NextResponse.json({ ok: true, hooks });
}
