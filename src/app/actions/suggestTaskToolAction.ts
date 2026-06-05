"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiLlmClient } from "@/infrastructure/llm/geminiLlmClient";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export async function suggestTaskToolAction(
  projectId: string,
  title: string,
  description: string,
): Promise<string | null> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return null;

  const tools = await prismaToolRepository.listByProject(projectId);
  const activeTools = tools.filter((t) => t.isEnabled);
  if (activeTools.length === 0) return null;

  const toolList = activeTools.map((t) => `${t.slug}: ${t.name}`).join(", ");

  try {
    const result = await geminiLlmClient.complete({
      system:
        "You are a task categorization assistant. Given a task title and description, pick the single most appropriate tool slug from the provided list. Respond with ONLY the exact slug string. If none fits well, respond with the word null.",
      prompt: `Tools: ${toolList}\n\nTitle: ${title}\nDescription: ${description}`,
      maxTokens: 30,
      responseFormat: "text",
    });
    const suggested = result.trim().replace(/^"|"$/g, "");
    if (suggested === "null") return null;
    if (!activeTools.find((t) => t.slug === suggested)) return null;
    return suggested;
  } catch {
    return null;
  }
}

// backward-compat alias
export const suggestTaskModuleAction = suggestTaskToolAction;
