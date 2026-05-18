import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { ProjectSettings } from "@/domain/project/settings/types";

export type UpdateProjectSettingsInput = {
  id: string;
  settings?: ProjectSettings;
  aiSpecGuideline?: string;
};

export async function updateProjectSettings(
  input: UpdateProjectSettingsInput,
  deps: { projects: ProjectRepository },
): Promise<void> {
  await deps.projects.update({
    id: input.id,
    settings:
      input.settings === undefined
        ? undefined
        : (input.settings as unknown as Record<string, unknown>),
    aiSpecGuideline:
      input.aiSpecGuideline === undefined ? undefined : input.aiSpecGuideline,
  });
}
