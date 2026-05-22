import path from "node:path";

import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.cwd !== "string" || !body.cwd) {
    return NextResponse.json({ ok: false, error: "cwd가 필요해요." }, { status: 400 });
  }

  const cwd = body.cwd;
  const title = path.basename(cwd) || cwd;

  const project = await prisma.project.upsert({
    where: { ownerId_cwd: { ownerId: user.id, cwd } },
    create: { title, cwd, ownerId: user.id },
    update: {},
    select: { id: true, title: true, cwd: true },
  });

  return NextResponse.json({ ok: true, projectId: project.id, title: project.title, cwd: project.cwd });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
