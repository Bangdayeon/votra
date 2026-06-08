"use server";

import type { ProjectCommandRecord } from "@/domain/memory/types";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

type RestoreInput = Pick<
  ProjectCommandRecord,
  "slug" | "name" | "description" | "folder" | "content" | "isBuiltIn"
>;

export async function restoreCommandsAction(
  items: RestoreInput[],
): Promise<{ ok: boolean; restored: ProjectCommandRecord[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, restored: [], error: "로그인이 필요해요." };

  const restored: ProjectCommandRecord[] = [];
  for (const item of items) {
    const record = await prismaCommandRepository.upsertByName({
      userId: user.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      folder: item.folder,
      content: item.content,
      isBuiltIn: item.isBuiltIn,
    });
    restored.push(record);
  }
  return { ok: true, restored };
}
