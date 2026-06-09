import { createHash } from "crypto";

import { NextResponse } from "next/server";

import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaExternalIngestRepository } from "@/infrastructure/repositories/prismaExternalIngestRepository";

const VALID_SOURCES = ["notion", "slack", "github", "linear"] as const;
const MAX_CONTENT_LENGTH = 10000;

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

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  }
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }
  if (typeof body.source !== "string" || !(VALID_SOURCES as readonly string[]).includes(body.source)) {
    return NextResponse.json(
      { ok: false, error: `source는 ${VALID_SOURCES.join(", ")} 중 하나여야 해요.` },
      { status: 400 },
    );
  }
  if (typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ ok: false, error: "content가 필요해요." }, { status: 400 });
  }
  if (body.content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `content는 ${MAX_CONTENT_LENGTH}자 이하여야 해요.` },
      { status: 400 },
    );
  }

  const projectRow = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { settings: true },
  });
  if (!projectRow) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  const settings = parseProjectSettings(projectRow.settings);
  if (!settings.integrations.sources.includes(body.source)) {
    return NextResponse.json(
      { ok: false, error: `${body.source} 연동이 활성화되지 않았어요.` },
      { status: 403 },
    );
  }

  const contentHash = createHash("sha256").update(`${body.source}:${body.content}`).digest("hex");
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl : undefined;
  const metadata =
    isRecord(body.metadata) ? (body.metadata as Record<string, unknown>) : undefined;

  const { record, duplicate } = await prismaExternalIngestRepository.upsert({
    projectId: body.projectId,
    source: body.source,
    content: body.content,
    contentHash,
    sourceUrl,
    metadata,
  });

  return NextResponse.json({ ok: true, id: record.id, duplicate });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
