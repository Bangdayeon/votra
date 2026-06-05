import { NextResponse } from "next/server";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { getProjectBrief } from "@/application/getProjectBrief";
import { listFolders } from "@/application/listFolders";
import { listMemoryReflections } from "@/application/listMemoryReflections";
import { seedDefaultTools } from "@/application/seedDefaultTools";
import type { ToolSuggestion } from "@/domain/memory/memoryTierTypes";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

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

  const [project, aiNextTask, aiSummary, foldersResult, longTermTasks, reflections, memoryContext, rawTools, latestReflectionRaw] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, cwd: true },
    }),
    prisma.projectAiNextTask.findUnique({ where: { projectId } }),
    prisma.projectAiSummary.findUnique({
      where: { projectId },
      select: { summary: true, warnings: true, suggestions: true },
    }),
    listFolders(projectId, { folders: prismaTaskFolderRepository }),
    prismaTaskRepository.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 10 }),
    listMemoryReflections(projectId, 1, { reflections: prismaMemoryReflectionRepository }),
    prismaMemoryContextRepository.findByProject(projectId),
    prismaToolRepository.listByProject(projectId),
    prisma.projectMemoryReflection.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { toolSuggestions: true },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  // 새 프로젝트: 커스텀 스킬 0개이면 기본 스킬 lazy seeding
  let toolsResult = rawTools;
  if (toolsResult.length === 0) {
    await seedDefaultTools(projectId, { tools: prismaToolRepository });
    toolsResult = await prismaToolRepository.listByProject(projectId);
  }

  const result = await getProjectBrief(
    {
      projectId,
      userId: user.id,
      projectTitle: project.title,
      cwd: project.cwd,
    },
    {
      tasks: prismaTaskRepository,
    },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

  const folders = foldersResult.ok ? foldersResult.value : [];

  const tools = toolsResult
    .filter((s) => s.isEnabled)
    .map((s) => ({ slug: s.slug, name: s.name, folder: s.folder, contextHint: s.contextHint ?? s.description }));

  const existingToolNames = new Set(toolsResult.map((s) => s.name.toLowerCase()));
  const rawSuggestions = (latestReflectionRaw?.toolSuggestions as ToolSuggestion[]) ?? [];
  const toolSuggestions = rawSuggestions.filter((s) => !existingToolNames.has(s.name.toLowerCase()));

  const latestReflection = reflections[0];

  return NextResponse.json({
    ok: true,
    brief: {
      ...result.value,
      folders,
      tools,
      recommendedNextTasks: aiNextTask ? (aiNextTask.tasks as NextTask[]) : undefined,
      aiSummary: aiSummary ?? undefined,
      longTermTasks: longTermTasks.map((t) => ({
        seq: t.seq,
        title: t.title,
        lastAccessedAt: t.lastAccessedAt?.toISOString() ?? null,
      })),
      latestReflection: latestReflection
        ? {
            contextSummary: latestReflection.contextSummary,
            insights: latestReflection.insights,
            suggestedTasks: latestReflection.suggestedTasks,
          }
        : undefined,
      toolSuggestions: toolSuggestions.length > 0 ? toolSuggestions : undefined,
      memoryContext: memoryContext?.content ?? null,
    },
  });
}
