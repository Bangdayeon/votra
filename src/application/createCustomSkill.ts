import type { CreateCustomSkillInput, CustomSkillRepository } from "@/application/ports/customSkillRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export async function createCustomSkill(
  input: CreateCustomSkillInput,
  deps: { customSkills: CustomSkillRepository },
): Promise<Result<ProjectToolRecord, string>> {
  if (!input.name.trim()) return err("스킬 이름이 필요해요.");
  if (!input.content.trim()) return err("스킬 내용이 필요해요.");
  try {
    const skill = await deps.customSkills.create(input);
    return ok(skill);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커스텀 스킬 생성에 실패했어요.");
  }
}
