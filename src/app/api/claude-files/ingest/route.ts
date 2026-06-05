import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";

const MAX_CONTENT_BYTES = 32 * 1024;
const VALID_KINDS = ["CLAUDE", "AGENTS", "SKILL"] as const;
type FileKind = (typeof VALID_KINDS)[number];

type IngestFile = {
  displayPath: string;
  kind: FileKind;
  scope: string;
  content: string;
};

function toSlug(displayPath: string): string {
  const sanitized = displayPath
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `cf-${sanitized}`;
}

function toDescription(kind: FileKind, scope: string): string {
  const kindLabel = kind === "CLAUDE" ? "Claude 지침" : kind === "AGENTS" ? "에이전트 지침" : "커스텀 스킬";
  const scopeLabel = scope === "global" ? "전역" : scope === "project-root" ? "프로젝트 루트" : "서브디렉토리";
  return `${kindLabel} (${scopeLabel})`;
}

function toContextHint(kind: FileKind, displayPath: string): string {
  if (kind === "CLAUDE") return `Claude Code 지침: ${displayPath}`;
  if (kind === "AGENTS") return `에이전트 협업 규칙: ${displayPath}`;
  return `커스텀 스킬 정의: ${displayPath}`;
}

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
  if (typeof body.source !== "string" || !body.source) {
    return NextResponse.json({ ok: false, error: "source(cwd)가 필요해요." }, { status: 400 });
  }
  if (!Array.isArray(body.files)) {
    return NextResponse.json({ ok: false, error: "files 배열이 필요해요." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { ownerId_cwd: { ownerId: user.id, cwd: body.source } },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { ok: false, error: `cwd '${body.source}'에 해당하는 프로젝트가 없어요. 먼저 세션 ingest를 실행해주세요.` },
      { status: 404 },
    );
  }

  const files = (body.files as unknown[]).filter(isValidFile);
  let count = 0;

  for (const file of files) {
    const slug = toSlug(file.displayPath);
    const content =
      file.content.length > MAX_CONTENT_BYTES ? file.content.slice(0, MAX_CONTENT_BYTES) : file.content;

    await prisma.projectTool.upsert({
      where: { projectId_slug: { projectId: project.id, slug } },
      create: {
        projectId: project.id,
        slug,
        name: file.displayPath,
        description: toDescription(file.kind, file.scope),
        folder: "에이전트 파일",
        content,
        contextHint: toContextHint(file.kind, file.displayPath),
        isEnabled: false,
      },
      update: {
        content,
        description: toDescription(file.kind, file.scope),
        contextHint: toContextHint(file.kind, file.displayPath),
      },
    });
    count++;
  }

  return NextResponse.json({ ok: true, projectId: project.id, count });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidFile(v: unknown): v is IngestFile {
  if (!isRecord(v)) return false;
  return (
    typeof v.displayPath === "string" &&
    v.displayPath.length > 0 &&
    (VALID_KINDS as readonly string[]).includes(v.kind as string) &&
    typeof v.scope === "string" &&
    typeof v.content === "string"
  );
}
