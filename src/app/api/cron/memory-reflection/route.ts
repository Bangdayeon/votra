import { NextResponse } from "next/server";

import { applyToolEnrichments } from "@/application/applyToolEnrichments";
import { applyToolSuggestions } from "@/application/applyToolSuggestions";
import { learnAndUpdateContext } from "@/application/learnAndUpdateContext";
import { refreshProjectAiSummary } from "@/application/refreshProjectAiSummary";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { prisma } from "@/infrastructure/db/prisma";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiContextEngine } from "@/infrastructure/llm/geminiContextEngine";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      settings: true,
      members: { where: { role: "OWNER" }, select: { userId: true }, take: 1 },
    },
  });

  const results = await Promise.allSettled(
    projects.map(async (p) => {
      const settings = parseProjectSettings(p.settings);
      const reflectionEngine = createGeminiReflectionEngine(geminiLlmClient, settings.ai.reflectionInstruction);
      const contextEngine = createGeminiContextEngine(geminiLlmClient, settings.ai.contextInstruction);

      const reflection = await runMemoryReflection(p.id, "cron", {
        tasks: prismaTaskRepository,
        reflections: prismaMemoryReflectionRepository,
        tools: prismaToolRepository,
        engine: reflectionEngine,
      });

      const ownerId = p.members[0]?.userId;

      if (ownerId && reflection.toolSuggestions.length > 0) {
        await applyToolSuggestions(p.id, ownerId, reflection.toolSuggestions, {
          tools: prismaToolRepository,
        });
      }

      if (ownerId && reflection.toolEnrichments.length > 0) {
        await applyToolEnrichments(p.id, ownerId, reflection.toolEnrichments, {
          tools: prismaToolRepository,
        });
      }
      await learnAndUpdateContext(p.id, {
        tasks: prismaTaskRepository,
        context: prismaMemoryContextRepository,
        engine: contextEngine,
      });

      const memoryContext = await prismaMemoryContextRepository.findByProject(p.id);
      if (memoryContext) {
        await refreshProjectAiSummary(p.id, {
          projects: prismaProjectRepository,
          aiSummaries: prismaProjectAiSummaryRepository,
          nextTasks: prismaProjectAiNextTaskRepository,
          tasks: prismaTaskRepository,
          llm: geminiLlmClient,
          memoryContext: memoryContext.content,
        }).catch(() => {});
      }
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ ok: true, succeeded, failed });
}
