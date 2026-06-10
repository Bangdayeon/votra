import { NextResponse } from "next/server";

import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

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

  const access = await assertApiKeyProjectAccess(user.id, projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

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
