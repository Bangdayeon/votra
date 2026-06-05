import { NextResponse } from "next/server";

import { applyToolSuggestions } from "@/application/applyToolSuggestions";
import { learnAndUpdateContext } from "@/application/learnAndUpdateContext";
import { refreshProjectAiSummary } from "@/application/refreshProjectAiSummary";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import { prisma } from "@/infrastructure/db/prisma";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiContextEngine } from "@/infrastructure/llm/geminiContextEngine";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaProjectAiSummaryRepository } from "@/infrastructure/repositories/prismaProjectAiSummaryRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const projects = await prisma.project.findMany({ select: { id: true } });
  const reflectionEngine = createGeminiReflectionEngine(geminiLlmClient);
  const contextEngine = createGeminiContextEngine(geminiLlmClient);

  const results = await Promise.allSettled(
    projects.map(async (p) => {
      const reflection = await runMemoryReflection(p.id, "cron", {
        tasks: prismaTaskRepository,
        reflections: prismaMemoryReflectionRepository,
        engine: reflectionEngine,
      });

      if (reflection.toolSuggestions.length > 0) {
        await applyToolSuggestions(p.id, reflection.toolSuggestions, {
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
