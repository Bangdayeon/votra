import type { SkillRepository } from "@/application/ports/skillRepository";
import type { SkillRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listSkills(
  projectId: string,
  deps: { skills: SkillRepository },
): Promise<Result<SkillRecord[], string>> {
  try {
    const skills = await deps.skills.listWithConfig(projectId);
    return ok(skills);
  } catch (e) {
    return err(e instanceof Error ? e.message : "스킬 목록을 불러오지 못했어요.");
  }
}
