import { NextResponse } from "next/server";

import { listMemoryReflections } from "@/application/listMemoryReflections";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const access = await assertApiKeyProjectAccess(user.id, projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10), 20);

  const reflections = await listMemoryReflections(projectId, limit, {
    reflections: prismaMemoryReflectionRepository,
  });

  return NextResponse.json({ ok: true, reflections });
}
