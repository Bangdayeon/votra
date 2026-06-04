import type { CustomSkillRepository } from "@/application/ports/customSkillRepository";
import type { SkillSuggestion } from "@/domain/memory/memoryTierTypes";

export async function applySkillSuggestions(
  projectId: string,
  suggestions: SkillSuggestion[],
  deps: { customSkills: CustomSkillRepository },
): Promise<void> {
  if (suggestions.length === 0) return;

  await Promise.all(
    suggestions.map((s) =>
      deps.customSkills.upsertByName({
        projectId,
        name: s.name,
        description: s.description,
        folder: s.folder,
        content: s.content,
        patternSummary: s.patternSummary,
      }),
    ),
  );
}
