import { NextResponse } from "next/server";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { getProjectBrief } from "@/application/getProjectBrief";
import { listFolders } from "@/application/listFolders";
import { listMemoryReflections } from "@/application/listMemoryReflections";
import { listSkills } from "@/application/listSkills";
import type { SkillSuggestion } from "@/domain/memory/memoryTierTypes";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaSkillRepository } from "@/infrastructure/repositories/prismaSkillRepository";
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

  const [project, aiNextTask, aiSummary, briefSkillRow, foldersResult, skillsResult, longTermTasks, reflections, memoryContext, customSkillsResult, latestReflectionRaw] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true, cwd: true },
    }),
    prisma.projectAiNextTask.findUnique({ where: { projectId } }),
    prisma.projectAiSummary.findUnique({
      where: { projectId },
      select: { summary: true, warnings: true, suggestions: true },
    }),
    prisma.platformSkill.findUnique({
      where: { slug: "brief" },
      select: { content: true, isActive: true },
    }),
    listFolders(projectId, { folders: prismaTaskFolderRepository }),
    listSkills(projectId, { skills: prismaSkillRepository }),
    prismaTaskRepository.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 10 }),
    listMemoryReflections(projectId, 1, { reflections: prismaMemoryReflectionRepository }),
    prismaMemoryContextRepository.findByProject(projectId),
    prismaCustomSkillRepository.listByProject(projectId),
    prisma.projectMemoryReflection.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { skillSuggestions: true },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
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

  let briefSkillContent: string | undefined;
  if (briefSkillRow?.isActive) {
    const skillConfig = await prisma.projectSkillConfig.findUnique({
      where: { projectId_skillSlug: { projectId, skillSlug: "brief" } },
    });
    if (skillConfig?.enabled ?? true) {
      briefSkillContent = briefSkillRow.content;
    }
  }

  const folders = foldersResult.ok ? foldersResult.value : [];

  // brief 스킬 자체는 목록에서 제외 (appendix로만 사용)
  const availableSkills = (skillsResult.ok ? skillsResult.value : [])
    .filter((s) => s.slug !== "brief" && s.enabled)
    .map((s) => ({ slug: s.slug, name: s.name, contextHint: s.contextHint, category: s.category }));

  const customSkills = customSkillsResult
    .filter((s) => s.isEnabled)
    .map((s) => ({ slug: s.slug, name: s.name, folder: s.folder, contextHint: s.description }));

  const existingSkillNames = new Set(customSkillsResult.map((s) => s.name.toLowerCase()));
  const rawSuggestions = (latestReflectionRaw?.skillSuggestions as SkillSuggestion[]) ?? [];
  const skillSuggestions = rawSuggestions.filter((s) => !existingSkillNames.has(s.name.toLowerCase()));

  const latestReflection = reflections[0];

  return NextResponse.json({
    ok: true,
    brief: {
      ...result.value,
      folders,
      availableSkills,
      recommendedNextTasks: aiNextTask ? (aiNextTask.tasks as NextTask[]) : undefined,
      aiSummary: aiSummary ?? undefined,
      briefSkillContent,
      longTermTasks: longTermTasks.map((t) => ({
        seq: t.seq,
        title: t.title,
        lastAccessedAt: t.lastAccessedAt?.toISOString() ?? null,
      })),
      latestReflection: latestReflection
        ? { contextSummary: latestReflection.contextSummary, insights: latestReflection.insights }
        : undefined,
      customSkills,
      skillSuggestions: skillSuggestions.length > 0 ? skillSuggestions : undefined,
      memoryContext: memoryContext?.content ?? null,
    },
  });
}
