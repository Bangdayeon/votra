"use server";

import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type GetIntegrationSourcesResult =
  | { ok: true; sources: string[] }
  | { ok: false; error: string };

export async function getIntegrationSourcesAction(
  projectId: string,
): Promise<GetIntegrationSourcesResult> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  try {
    const row = await prismaProjectRepository.findSettings(projectId);
    if (!row) return { ok: false, error: "프로젝트를 찾을 수 없어요." };
    const settings = parseProjectSettings(row.settings);
    return { ok: true, sources: settings.integrations.sources };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "불러오기 실패" };
  }
}
