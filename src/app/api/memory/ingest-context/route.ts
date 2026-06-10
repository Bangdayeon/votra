import { NextResponse } from "next/server";

import { applyToolEnrichments } from "@/application/applyToolEnrichments";
import { applyToolSuggestions } from "@/application/applyToolSuggestions";
import { ingestExternalContext } from "@/application/ingestExternalContext";
import { learnAndUpdateContext } from "@/application/learnAndUpdateContext";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiContextEngine } from "@/infrastructure/llm/geminiContextEngine";
import { createGeminiKeyDecisionsEngine } from "@/infrastructure/llm/geminiKeyDecisionsEngine";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaExternalIngestRepository } from "@/infrastructure/repositories/prismaExternalIngestRepository";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

const VALID_TYPES = ["decision", "insight", "reference"] as const;
type ContextType = (typeof VALID_TYPES)[number];

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

  if (!isRecord(body)) return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }

  const access = await assertApiKeyProjectAccess(user.id, body.projectId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  if (typeof body.title !== "string" || !body.title) {
    return NextResponse.json({ ok: false, error: "title이 필요해요." }, { status: 400 });
  }
  if (typeof body.content !== "string" || !body.content) {
    return NextResponse.json({ ok: false, error: "content가 필요해요." }, { status: 400 });
  }
  if (body.content.length > 8000) {
    return NextResponse.json({ ok: false, error: "content는 8000자 이하여야 해요." }, { status: 400 });
  }
  if (typeof body.source !== "string" || !body.source) {
    return NextResponse.json({ ok: false, error: "source가 필요해요." }, { status: 400 });
  }

  const type: ContextType | undefined =
    typeof body.type === "string" && (VALID_TYPES as readonly string[]).includes(body.type)
      ? (body.type as ContextType)
      : undefined;

  const projectRow = await prisma.project.findUnique({ where: { id: body.projectId }, select: { settings: true } });
  const settings = parseProjectSettings(projectRow?.settings);

  const keyDecisions = await createGeminiKeyDecisionsEngine(geminiLlmClient, settings.ai.keyDecisionInstruction).extract({
    summary: body.title,
    outcome: body.content.slice(0, 3000),
  });

  const result = await ingestExternalContext(
    {
      projectId: body.projectId,
      userId: user.id,
      title: body.title,
      content: body.content,
      source: body.source,
      keyDecisions,
      type,
    },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  emitProjectUpdate(body.projectId);

  void checkAndTriggerReflection(body.projectId, user.id).catch((err: unknown) => console.error("[memory] reflection trigger failed:", err));
  void learnAndUpdateContext(body.projectId, {
    tasks: prismaTaskRepository,
    context: prismaMemoryContextRepository,
    engine: createGeminiContextEngine(geminiLlmClient, settings.ai.contextInstruction),
  }).catch((err: unknown) => console.error("[memory] context learning failed:", err));

  return NextResponse.json({ ok: true, task: result.value.task, extractedDecisions: keyDecisions.length });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function checkAndTriggerReflection(projectId: string, userId: string): Promise<void> {
  const projectRow = await prisma.project.findUnique({ where: { id: projectId }, select: { settings: true } });
  if (!projectRow) return;

  const settings = parseProjectSettings(projectRow.settings);
  const latest = await prismaMemoryReflectionRepository.getLatest(projectId);
  const sinceDate = latest ? latest.createdAt : new Date(0);

  const count = await prismaTaskRepository.countActivitySince({ projectId, sinceDate });
  if (count < settings.memory.reflectionThreshold) return;

  const engine = createGeminiReflectionEngine(geminiLlmClient);
  const reflection = await runMemoryReflection(projectId, "threshold", {
    tasks: prismaTaskRepository,
    reflections: prismaMemoryReflectionRepository,
    tools: prismaToolRepository,
    engine,
    externalIngests: prismaExternalIngestRepository,
  });

  if (reflection.toolSuggestions.length > 0) {
    await applyToolSuggestions(projectId, userId, reflection.toolSuggestions, {
      tools: prismaToolRepository,
    }).catch(() => {});
  }

  if (reflection.toolEnrichments.length > 0) {
    await applyToolEnrichments(projectId, userId, reflection.toolEnrichments, {
      tools: prismaToolRepository,
    }).catch(() => {});
  }

}
