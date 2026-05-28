"use server";

import { listSkills } from "@/application/listSkills";
import type { SkillRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaSkillRepository } from "@/infrastructure/repositories/prismaSkillRepository";

export type { SkillRecord };

export async function getProjectSkillsAction(projectId: string): Promise<SkillRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await listSkills(projectId, { skills: prismaSkillRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
