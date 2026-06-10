import { NextResponse } from "next/server";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { getProjectBrief } from "@/application/getProjectBrief";
import { listFolders } from "@/application/listFolders";
import { listMemoryReflections } from "@/application/listMemoryReflections";
import { seedDefaultCommands } from "@/application/seedDefaultCommands";
import { seedDefaultTools } from "@/application/seedDefaultTools";
import { INTEGRATION_INSTRUCTIONS } from "@/domain/memory/integrationInstructions";
import type { ToolSuggestion } from "@/domain/memory/memoryTierTypes";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { geminiEmbeddingClient } from "@/infrastructure/llm/geminiEmbeddingClient";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";
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
  // slim=true: skip heavy optional fields (AI summary, reflections, long-term tasks, vector recall)
  // Use when agent only needs tasks + tools + commands for quick startup.
  const slim = searchParams.get("slim") === "true";

  const coreQueries = [
    prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, cwd: true, settings: true },
    }),
    listFolders(projectId, { folders: prismaTaskFolderRepository }),
    prismaMemoryContextRepository.findByProject(projectId),
    prismaToolRepository.listByProject(projectId),
    prismaToolRepository.listGlobal(user.id),
    prismaCommandRepository.listByUser(user.id),
  ] as const;

  const heavyQueries = slim
    ? ([null, null, null, null, null] as const)
    : ([
        prisma.projectAiNextTask.findUnique({ where: { projectId } }),
        prisma.projectAiSummary.findUnique({
          where: { projectId },
          select: { summary: true, warnings: true, suggestions: true },
        }),
        prismaTaskRepository.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 10 }),
        listMemoryReflections(projectId, 1, { reflections: prismaMemoryReflectionRepository }),
        prisma.projectMemoryReflection.findFirst({
          where: { projectId },
          orderBy: { createdAt: "desc" },
          select: { toolSuggestions: true },
        }),
      ] as const);

  const [
    [project, foldersResult, memoryContext, rawProjectTools, rawGlobalTools, rawCommands],
    [aiNextTask, aiSummary, longTermTasksRaw, reflections, latestReflectionRaw],
  ] = await Promise.all([
    Promise.all(coreQueries),
    Promise.all(heavyQueries),
  ]);

  const longTermTasks = longTermTasksRaw ?? [];

  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
  }

  // 글로벌 툴이 없으면 기본 툴 lazy seeding
  let globalTools = rawGlobalTools;
  if (globalTools.length === 0) {
    await seedDefaultTools(user.id, { tools: prismaToolRepository });
    globalTools = await prismaToolRepository.listGlobal(user.id);
  }

  // 커맨드가 없으면 기본 커맨드 lazy seeding
  let commands = rawCommands;
  if (commands.length === 0) {
    await seedDefaultCommands(user.id, { commands: prismaCommandRepository });
    commands = await prismaCommandRepository.listByUser(user.id);
  }

  // 글로벌 + 프로젝트 툴 합산 (글로벌 우선, 중복 slug 제거)
  const globalSlugs = new Set(globalTools.map((t) => t.slug));
  const toolsResult = [...globalTools, ...rawProjectTools.filter((t) => !globalSlugs.has(t.slug))];

  const result = await getProjectBrief(
    {
      projectId,
      userId: user.id,
      projectTitle: project.title,
      cwd: project.cwd,
    },
    {
      tasks: prismaTaskRepository,
      embedding: slim ? undefined : geminiEmbeddingClient,
    },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

  const projectSettings = parseProjectSettings(project.settings);
  const folders = foldersResult.ok ? foldersResult.value : [];

  const tools = toolsResult
    .filter((s) => s.isEnabled)
    .map((s) => ({ slug: s.slug, name: s.name, folder: s.folder, contextHint: s.contextHint ?? s.description }));

  const existingToolNames = new Set(toolsResult.map((s) => s.name.toLowerCase()));
  const rawSuggestions = (latestReflectionRaw?.toolSuggestions as ToolSuggestion[]) ?? [];
  const toolSuggestions = rawSuggestions.filter((s) => !existingToolNames.has(s.name.toLowerCase()));

  const latestReflection = reflections?.[0];

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
      memoryContext: memoryContext ? {
        serviceDescription: memoryContext.serviceDescription,
        techStack: memoryContext.techStack,
        targetUsers: memoryContext.targetUsers,
        currentGoal: memoryContext.currentGoal,
      } : null,
      enabledIntegrations: projectSettings.integrations.sources,
      integrationInstructions: projectSettings.integrations.sources
        .map((src) => INTEGRATION_INSTRUCTIONS[src])
        .filter(Boolean),
      commands: commands.map((c) => ({ slug: c.slug, name: c.name, description: c.description })),
    },
  });
}
