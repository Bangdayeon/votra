"use server";

import { applyToolEnrichments } from "@/application/applyToolEnrichments";
import { applyToolSuggestions } from "@/application/applyToolSuggestions";
import { createProposalTasks } from "@/application/createProposalTasks";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";
import { prismaMemoryReflectionRepository } from "@/infrastructure/repositories/prismaMemoryReflectionRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type { MemoryReflectionRecord };

export async function triggerMemoryReflectionAction(
  projectId: string,
): Promise<MemoryReflectionRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const engine = createGeminiReflectionEngine(geminiLlmClient);
  const reflection = await runMemoryReflection(projectId, "threshold", {
    tasks: prismaTaskRepository,
    reflections: prismaMemoryReflectionRepository,
    tools: prismaToolRepository,
    engine,
  });

  if (reflection.toolSuggestions.length > 0) {
    await applyToolSuggestions(projectId, reflection.toolSuggestions, {
      tools: prismaToolRepository,
    }).catch(() => {});
  }

  if (reflection.toolEnrichments.length > 0) {
    await applyToolEnrichments(projectId, reflection.toolEnrichments, {
      tools: prismaToolRepository,
    }).catch(() => {});
  }

  if (reflection.suggestedTasks.length > 0) {
    await createProposalTasks(projectId, guard.userId, reflection.suggestedTasks, {
      tasks: prismaTaskRepository,
    }).catch(() => {});
  }

  return reflection;
}
