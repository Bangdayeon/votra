import { NextResponse } from "next/server";

import { finishTask } from "@/application/finishTask";
import { learnAndUpdateContext } from "@/application/learnAndUpdateContext";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiContextEngine } from "@/infrastructure/llm/geminiContextEngine";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

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
  if (typeof body.summary !== "string" || !body.summary) {
    return NextResponse.json({ ok: false, error: "summary가 필요해요." }, { status: 400 });
  }

  const aiTool = typeof body.aiTool === "string" && body.aiTool ? body.aiTool : "unknown";
  const keyDecisions = Array.isArray(body.keyDecisions)
    ? (body.keyDecisions as unknown[]).filter((d): d is string => typeof d === "string")
    : undefined;
  const outcome = typeof body.outcome === "string" && body.outcome ? body.outcome : undefined;

  const result = await finishTask(
    { seq, userId: user.id, projectId: body.projectId, summary: body.summary, aiTool, keyDecisions, outcome },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  emitProjectUpdate(body.projectId);

  void checkAndTriggerReflection(body.projectId).catch(() => {});
  void learnAndUpdateContext(body.projectId, {
    tasks: prismaTaskRepository,
    context: prismaMemoryContextRepository,
    engine: createGeminiContextEngine(geminiLlmClient),
  }).catch(() => {});

  return NextResponse.json({ ok: true, task: result.value.task });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function checkAndTriggerReflection(projectId: string): Promise<void> {
  const projectRow = await prisma.project.findUnique({ where: { id: projectId }, select: { settings: true } });
  if (!projectRow) return;

  const settings = parseProjectSettings(projectRow.settings);
  const latest = await prismaMemoryReflectionRepository.getLatest(projectId);
  const sinceDate = latest ? latest.createdAt : new Date(0);

  const count = await prismaTaskRepository.countActivitySince({ projectId, sinceDate });
  if (count < settings.memory.reflectionThreshold) return;

  const engine = createGeminiReflectionEngine(geminiLlmClient);
  await runMemoryReflection(projectId, "threshold", {
    tasks: prismaTaskRepository,
    reflections: prismaMemoryReflectionRepository,
    engine,
  });
}
