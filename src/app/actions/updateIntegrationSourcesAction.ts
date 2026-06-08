"use server";

import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type UpdateIntegrationSourcesResult =
  | { ok: true; sources: string[] }
  | { ok: false; error: string };

export async function updateIntegrationSourcesAction(input: {
  projectId: string;
  sources: string[];
}): Promise<UpdateIntegrationSourcesResult> {
  const guard = await assertProjectOwner(input.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  try {
    const row = await prismaProjectRepository.findSettings(input.projectId);
    if (!row) return { ok: false, error: "프로젝트를 찾을 수 없어요." };

    const existing = parseProjectSettings(row.settings);
    const merged = { ...existing, integrations: { sources: input.sources } };

    await prismaProjectRepository.update({
      id: input.projectId,
      settings: merged as unknown as Record<string, unknown>,
    });

    return { ok: true, sources: input.sources };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "저장 실패" };
  }
}
