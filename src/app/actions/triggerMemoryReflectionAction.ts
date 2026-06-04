"use server";

import { applySkillSuggestions } from "@/application/applySkillSuggestions";
import { runMemoryReflection } from "@/application/runMemoryReflection";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { createGeminiReflectionEngine } from "@/infrastructure/llm/geminiReflectionEngine";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";
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
    engine,
  });

  if (reflection.skillSuggestions.length > 0) {
    await applySkillSuggestions(projectId, reflection.skillSuggestions, {
      customSkills: prismaCustomSkillRepository,
    }).catch(() => {});
  }

  return reflection;
}
