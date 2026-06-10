import { NextResponse } from "next/server";

import { applyToolEnrichments } from "@/application/applyToolEnrichments";
import { applyToolSuggestions } from "@/application/applyToolSuggestions";
import { finishTask } from "@/application/finishTask";
import type { EmbeddingClient } from "@/application/ports/embeddingClient";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import type { TaskRecord } from "@/domain/memory/types";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertApiKeyProjectAccess } from "@/infrastructure/auth/assertApiKeyProjectAccess";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { geminiEmbeddingClient } from "@/infrastructure/llm/geminiEmbeddingClient";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiKeyDecisionsEngine } from "@/infrastructure/llm/geminiKeyDecisionsEngine";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaExternalIngestRepository } from "@/infrastructure/repositories/prismaExternalIngestRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { taskId } = await params;
  const seq = parseInt(taskId, 10);
  if (isNaN(seq) || seq <= 0) {
    return NextResponse.json({ ok: false, error: "taskId는 양의 정수(seq 번호)여야 해요." }, { status: 400 });
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

  if (typeof body.summary !== "string" || !body.summary) {
    return NextResponse.json({ ok: false, error: "summary가 필요해요." }, { status: 400 });
  }

  const aiTool = typeof body.aiTool === "string" && body.aiTool ? body.aiTool : "unknown";
  const providedDecisions = Array.isArray(body.keyDecisions)
    ? (body.keyDecisions as unknown[]).filter((d): d is string => typeof d === "string")
    : undefined;
  const outcome = typeof body.outcome === "string" && body.outcome ? body.outcome : undefined;

  const projectRow = await prisma.project.findUnique({ where: { id: body.projectId }, select: { settings: true } });
  const settings = parseProjectSettings(projectRow?.settings);

  const keyDecisions = providedDecisions ??
    await createGeminiKeyDecisionsEngine(geminiLlmClient, settings.ai.keyDecisionInstruction).extract({ summary: body.summary, outcome });

  const result = await finishTask(
    { seq, userId: user.id, projectId: body.projectId, summary: body.summary, aiTool, keyDecisions, outcome },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(body.projectId);

  void checkAndTriggerReflection(body.projectId, user.id).catch((err: unknown) => console.error("[memory] reflection trigger failed:", err));
  void generateTaskEmbedding(result.value.task, geminiEmbeddingClient).catch((err: unknown) => console.error("[memory] embedding failed:", err));

  return NextResponse.json({ ok: true, task: result.value.task });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function generateTaskEmbedding(task: TaskRecord, embedder: EmbeddingClient): Promise<void> {
  const parts = [
    `유저 요구: ${task.title}`,
    task.keyDecisions.length > 0 ? `핵심 결정: ${task.keyDecisions.join(". ")}` : "",
    task.outcome ? `결론: ${task.outcome}` : "",
  ].filter(Boolean);
  const embedding = await embedder.embed(parts.join("\n"), "RETRIEVAL_DOCUMENT");
  await prismaTaskRepository.updateEmbedding({ taskId: task.id, embedding });
}

async function checkAndTriggerReflection(projectId: string, userId: string): Promise<void> {
  const projectRow = await prisma.project.findUnique({ where: { id: projectId }, select: { settings: true } });
  if (!projectRow) return;

  const settings = parseProjectSettings(projectRow.settings);
  const latest = await prismaMemoryReflectionRepository.getLatest(projectId);
  const sinceDate = latest ? latest.createdAt : new Date(0);

  const count = await prismaTaskRepository.countActivitySince({ projectId, sinceDate });
  if (count < settings.memory.reflectionThreshold) return;

  const engine = createGeminiReflectionEngine(geminiLlmClient, settings.ai.reflectionInstruction);
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
