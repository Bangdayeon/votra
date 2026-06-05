import { NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
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
    select: { settings: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  const settings = parseProjectSettings(project.settings);
  return NextResponse.json({ ok: true, sources: settings.integrations.sources });
}

export async function PATCH(req: Request) {
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

  if (!isRecord(body)) return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }
  if (!Array.isArray(body.sources)) {
    return NextResponse.json({ ok: false, error: "sources 배열이 필요해요." }, { status: 400 });
  }

  const sources = (body.sources as unknown[]).filter((s): s is string => typeof s === "string");

  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { settings: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  const existing = parseProjectSettings(project.settings);
  const updated = { ...existing, integrations: { sources } };

  await prisma.project.update({
    where: { id: body.projectId },
    data: { settings: updated as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, sources });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
