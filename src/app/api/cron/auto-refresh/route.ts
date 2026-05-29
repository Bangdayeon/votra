import { NextResponse } from "next/server";

import { refreshProjectAiSummary } from "@/application/refreshProjectAiSummary";
import { refreshProjectNextTasks } from "@/application/refreshProjectNextTasks";
import { prisma } from "@/infrastructure/db/prisma";
import { processGitClient } from "@/infrastructure/git/processGitClient";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // KST = UTC + 9
  const kstHour = (new Date().getUTCHours() + 9) % 24;

  const projects = await prisma.project.findMany({
    where: {
      settings: {
        path: ["ai", "autoRefreshHour"],
        equals: kstHour,
      },
    },
    select: { id: true },
  });

  const deps = {
    projects: prismaProjectRepository,
    tasks: prismaTaskRepository,
    llm: geminiLlmClient,
    git: processGitClient,
  };

  const results = await Promise.allSettled(
    projects.map((p) =>
      Promise.all([
        refreshProjectAiSummary(p.id, {
          ...deps,
          aiSummaries: prismaProjectAiSummaryRepository,
        }),
        refreshProjectNextTasks(p.id, {
          ...deps,
          nextTasks: prismaProjectAiNextTaskRepository,
        }),
      ]),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, kstHour, succeeded, failed });
}
