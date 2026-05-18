import { ensureProjectGuideline } from "@/application/ensureProjectGuideline";
import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
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
  deps: {
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
  },
): Promise<ProjectSettingsBundle> {
  const row = await deps.projects.findSettings(projectId);
  const aiSpecGuideline = await ensureProjectGuideline(
    projectId,
    row.aiSpecGuideline,
    deps,
  );
  return {
    settings: parseProjectSettings(row.settings),
    aiSpecGuideline,
    aiSpecFileName: row.aiSpecFileName,
  };
}
