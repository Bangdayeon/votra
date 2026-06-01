import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import type { ProjectSettings } from "@/domain/project/settings/types";

export type ProjectSettingsBundle = {
  settings: ProjectSettings;
};

export async function getProjectSettings(
  projectId: string,
  deps: {
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
  },
): Promise<ProjectSettingsBundle> {
  const row = await deps.projects.findSettings(projectId);
  return {
    settings: parseProjectSettings(row.settings),
  };
}
