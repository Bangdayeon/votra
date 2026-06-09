"use server";

import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

const VALID_SOURCES = ["notion", "slack", "github", "linear"] as const;

export type ConnectIntegrationState = { error?: string };

export async function connectIntegrationAction(
  _prev: ConnectIntegrationState,
  formData: FormData,
): Promise<ConnectIntegrationState> {
  const projectId = String(formData.get("projectId") ?? "");
  const source = String(formData.get("source") ?? "");

  if (!projectId) return { error: "projectId가 없어요." };
  if (!(VALID_SOURCES as readonly string[]).includes(source)) {
    return { error: `지원하지 않는 서비스예요: ${source}` };
  }

  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) return { error: guard.error };

  const row = await prismaProjectRepository.findSettings(projectId);
  if (!row) return { error: "프로젝트를 찾을 수 없어요." };

  const existing = parseProjectSettings(row.settings);
  if (existing.integrations.sources.includes(source)) return {};

  const merged = {
    ...existing,
    integrations: { sources: [...existing.integrations.sources, source] },
  };

  await prismaProjectRepository.update({
    id: projectId,
    settings: merged as unknown as Record<string, unknown>,
  });

  return {};
}
