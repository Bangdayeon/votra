import { NextResponse } from "next/server";

import { ingestClaudeFiles } from "@/application/ingestClaudeFiles";
import type { ClaudeFileInput } from "@/application/ports/claudeFileRepository";
import type {
  ClaudeFileKind,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaClaudeFileEvaluationRepository } from "@/infrastructure/repositories/prismaClaudeFileEvaluationRepository";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

const PATH_SEP = "/";

const VALID_KINDS: ClaudeFileKind[] = ["CLAUDE", "AGENTS", "SKILL", "CURSOR", "GEMINI"];
const VALID_SCOPES: ClaudeFileScope[] = ["global", "project-root", "subdir"];
const MAX_CONTENT_BYTES = 256 * 1024;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON 파싱에 실패했어요." },
      { status: 400 },
    );
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 },
    );
  }

  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "API 키가 없거나 유효하지 않아요. Authorization: Bearer <key> 헤더를 확인해 주세요.",
      },
      { status: 401 },
    );
  }

  // 세션이 아직 들어오지 않은 cwd 로는 claude file 만 ingest 못 함 (세션 ingest 가 먼저).
  //
  // 매칭 우선순위 (sessions ingest 의 Project.cwd 는 extractCwd 결과 — 첫 이벤트의 cwd —
  // 라서 CLI 가 보낸 source 와 정확히 일치하지 않을 수 있어요. 같은 user 의 같은
  // 프로젝트 트리 안이라면 prefix 매칭으로 받아줘요):
  //   1. exact match
  //   2. Project.cwd 가 source 의 ancestor (예: source=/Users/bibi/votra, Project.cwd=/Users/bibi)
  //   3. source 가 Project.cwd 의 ancestor (예: source=/Users/bibi/votra, Project.cwd=/Users/bibi/votra/src)
  const project = await findProjectByCwdLenient(parsed.source, user.id);
  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        error: "프로젝트가 없어요. 세션을 먼저 ingest 해 주세요.",
      },
      { status: 404 },
    );
  }

  await ingestClaudeFiles(
    { projectId: project.id, files: parsed.files },
    {
      claudeFiles: prismaClaudeFileRepository,
      evaluations: prismaClaudeFileEvaluationRepository,
      projects: prismaProjectRepository,
      policyRules: prismaPolicyRuleRepository,
      llm: geminiLlmClient,
    },
  );

  return NextResponse.json({
    ok: true,
    projectId: project.id,
    count: parsed.files.length,
  });
}

type ParsedBody =
  | { ok: true; source: string; files: ClaudeFileInput[] }
  | { ok: false; error: string };

function parseBody(raw: unknown): ParsedBody {
  if (!isRecord(raw)) return { ok: false, error: "body 가 객체가 아니에요." };
  const source = raw.source;
  if (typeof source !== "string" || source.length === 0) {
    return { ok: false, error: "source 가 비어 있어요." };
  }
  const filesRaw = raw.files;
  if (!Array.isArray(filesRaw)) {
    return { ok: false, error: "files 가 배열이 아니에요." };
  }
  const files: ClaudeFileInput[] = [];
  for (let i = 0; i < filesRaw.length; i++) {
    const parsed = parseFile(filesRaw[i]);
    if (!parsed.ok) {
      return { ok: false, error: `files[${i}]: ${parsed.error}` };
    }
    files.push(parsed.value);
  }
  return { ok: true, source, files };
}

type ParsedFile =
  | { ok: true; value: ClaudeFileInput }
  | { ok: false; error: string };

function parseFile(raw: unknown): ParsedFile {
  if (!isRecord(raw)) return { ok: false, error: "객체가 아니에요." };
  const kind = raw.kind;
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as ClaudeFileKind)) {
    return { ok: false, error: "kind 가 올바르지 않아요." };
  }
  const scope = raw.scope;
  if (
    typeof scope !== "string" ||
    !VALID_SCOPES.includes(scope as ClaudeFileScope)
  ) {
    return { ok: false, error: "scope 가 올바르지 않아요." };
  }
  const absPath = raw.absPath;
  if (typeof absPath !== "string" || absPath.length === 0) {
    return { ok: false, error: "absPath 가 비어 있어요." };
  }
  const displayPath = raw.displayPath;
  if (typeof displayPath !== "string" || displayPath.length === 0) {
    return { ok: false, error: "displayPath 가 비어 있어요." };
  }
  const content = raw.content;
  if (typeof content !== "string") {
    return { ok: false, error: "content 가 문자열이 아니에요." };
  }
  const mtime = raw.mtime;
  if (typeof mtime !== "number" || !Number.isFinite(mtime)) {
    return { ok: false, error: "mtime 이 숫자가 아니에요." };
  }
  return {
    ok: true,
    value: {
      kind: kind as ClaudeFileKind,
      scope: scope as ClaudeFileScope,
      absPath,
      displayPath,
      content: content.length > MAX_CONTENT_BYTES
        ? content.slice(0, MAX_CONTENT_BYTES)
        : content,
      mtime,
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function findProjectByCwdLenient(
  source: string,
  ownerId: string,
): Promise<{ id: string; ownerId: string } | null> {
  const exact = await prismaProjectRepository.findByCwd({
    cwd: source,
    ownerId,
  });
  if (exact) return exact;

  const all = await prismaProjectRepository.list({ ownerId });
  const sourceWithSep = source + PATH_SEP;
  for (const p of all) {
    if (typeof p.cwd !== "string" || p.cwd.length === 0) continue;
    if (p.cwd === source) return { id: p.id, ownerId };
    const pCwdWithSep = p.cwd + PATH_SEP;
    if (source.startsWith(pCwdWithSep) || p.cwd.startsWith(sourceWithSep)) {
      return { id: p.id, ownerId };
    }
  }
  return null;
}
