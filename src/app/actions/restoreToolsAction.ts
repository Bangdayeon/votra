"use server";

import type { ProjectToolRecord } from "@/domain/memory/types";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

type RestoreInput = Pick<
  ProjectToolRecord,
  "slug" | "name" | "description" | "folder" | "content" | "isBuiltIn" | "projectId" |
  "patternSummary" | "contextHint" | "hookEvent" | "hookMatcher" | "hookScript"
>;

export async function restoreToolsAction(
  items: RestoreInput[],
): Promise<{ ok: boolean; restored: ProjectToolRecord[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, restored: [], error: "로그인이 필요해요." };

  const restored: ProjectToolRecord[] = [];
  for (const item of items) {
    const record = await prismaToolRepository.upsertByName({
      userId: user.id,
      projectId: item.projectId ?? undefined,
      slug: item.slug,
      name: item.name,
      description: item.description,
      folder: item.folder,
      content: item.content,
      isBuiltIn: item.isBuiltIn,
      patternSummary: item.patternSummary ?? undefined,
      contextHint: item.contextHint ?? undefined,
      hookEvent: item.hookEvent ?? undefined,
      hookMatcher: item.hookMatcher ?? undefined,
      hookScript: item.hookScript ?? undefined,
    });
    restored.push(record);
  }
  return { ok: true, restored };
}
