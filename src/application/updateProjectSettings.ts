import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { ProjectSettings } from "@/domain/project/settings/types";

export type AiSpecFileInput = { name: string; content: string };

export type UpdateProjectSettingsInput = {
  id: string;
  settings?: ProjectSettings;
  aiSpecGuideline?: string;
  /** undefined: 변경 없음. null: 파일 제거. 객체: 새 파일로 교체. */
  aiSpecFile?: AiSpecFileInput | null;
  /** undefined: 변경 없음. null/빈문자열: 제거. 문자열: 교체. */
  agentContextFlowPrompt?: string | null;
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
    aiSpecFile: input.aiSpecFile,
    agentContextFlowPrompt: input.agentContextFlowPrompt,
  });
}
