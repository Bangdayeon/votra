"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";

export async function suggestTaskModuleAction(
  projectId: string,
  title: string,
  description: string,
): Promise<string | null> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return null;

  const skills = await prismaCustomSkillRepository.listByProject(projectId);
  const activeSkills = skills.filter((s) => s.isEnabled);
  if (activeSkills.length === 0) return null;

  const skillList = activeSkills.map((s) => `${s.slug}: ${s.name}`).join(", ");

  try {
    const result = await geminiLlmClient.complete({
      system:
        "You are a task categorization assistant. Given a task title and description, pick the single most appropriate module slug from the provided list. Respond with ONLY the exact slug string. If none fits well, respond with the word null.",
      prompt: `Modules: ${skillList}\n\nTitle: ${title}\nDescription: ${description}`,
      maxTokens: 30,
      responseFormat: "text",
    });
    const suggested = result.trim().replace(/^"|"$/g, "");
    if (suggested === "null") return null;
    if (!activeSkills.find((s) => s.slug === suggested)) return null;
    return suggested;
  } catch {
    return null;
  }
}
