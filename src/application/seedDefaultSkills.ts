import { DEFAULT_SKILLS } from "@/domain/memory/defaultSkills";
import type { CustomSkillRepository } from "@/application/ports/customSkillRepository";

export async function seedDefaultSkills(
  projectId: string,
  deps: { customSkills: CustomSkillRepository },
): Promise<void> {
  for (const skill of DEFAULT_SKILLS) {
    await deps.customSkills.upsertByName({
      projectId,
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      folder: skill.folder,
      content: skill.content,
      isBuiltIn: true,
      contextHint: skill.contextHint,
    });
  }
}
