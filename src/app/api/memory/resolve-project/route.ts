import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cwd = searchParams.get("cwd");
  if (!cwd) {
    return NextResponse.json({ ok: false, error: "cwd가 필요해요." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { ownerId_cwd: { ownerId: user.id, cwd } },
    select: { id: true, title: true, cwd: true },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, error: `cwd '${cwd}'에 해당하는 프로젝트를 찾을 수 없어요. 먼저 votra upload를 실행해주세요.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, projectId: project.id, title: project.title, cwd: project.cwd });
}
