import type { CustomSkillRepository } from "@/application/ports/customSkillRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export async function listCustomSkills(
  projectId: string,
  deps: { customSkills: CustomSkillRepository },
): Promise<Result<ProjectToolRecord[], string>> {
  try {
    const skills = await deps.customSkills.listByProject(projectId);
    return ok(skills);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커스텀 스킬 목록을 불러오지 못했어요.");
  }
}
