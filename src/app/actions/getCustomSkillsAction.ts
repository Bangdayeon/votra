"use server";

import { listCustomSkills } from "@/application/listCustomSkills";
import type { ProjectCustomSkillRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";

export type { ProjectCustomSkillRecord };

export async function getCustomSkillsAction(projectId: string): Promise<ProjectCustomSkillRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await listCustomSkills(projectId, { customSkills: prismaCustomSkillRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
