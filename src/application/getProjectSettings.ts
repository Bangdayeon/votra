import type { ProjectRepository } from "@/application/ports/projectRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import type { ProjectSettings } from "@/domain/project/settings/types";

export type ProjectSettingsBundle = {
  settings: ProjectSettings;
  aiSpecGuideline: string;
  aiSpecFileName: string | null;
};

export async function getProjectSettings(
  projectId: string,
  deps: { projects: ProjectRepository },
): Promise<ProjectSettingsBundle> {
  const row = await deps.projects.findSettings(projectId);
  return {
    settings: parseProjectSettings(row.settings),
    aiSpecGuideline: row.aiSpecGuideline ?? "",
    aiSpecFileName: row.aiSpecFileName,
  };
}
