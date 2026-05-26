import { NextResponse } from "next/server";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { getProjectBrief } from "@/application/getProjectBrief";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";
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

  const [project, aiNextTask, aiSummary, briefSkillRow] = await Promise.all([
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
      claudeFiles: prismaClaudeFileRepository,
      sessionLogs: prismaSessionLogRepository,
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

  return NextResponse.json({
    ok: true,
    brief: {
      ...result.value,
      recommendedNextTasks: aiNextTask ? (aiNextTask.tasks as NextTask[]) : undefined,
      aiSummary: aiSummary ?? undefined,
      briefSkillContent,
    },
  });
}
