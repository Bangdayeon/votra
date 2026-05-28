import type { SkillRepository } from "@/application/ports/skillRepository";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function toggleSkill(
  input: { projectId: string; slug: string; enabled: boolean },
  deps: { skills: SkillRepository },
): Promise<Result<void, string>> {
  try {
    await deps.skills.setEnabled(input.projectId, input.slug, input.enabled);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : "스킬 설정 변경에 실패했어요.");
  }
}
