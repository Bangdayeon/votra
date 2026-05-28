"use server";

import { toggleSkill } from "@/application/toggleSkill";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaSkillRepository } from "@/infrastructure/repositories/prismaSkillRepository";

export async function toggleSkillAction(
  projectId: string,
  slug: string,
  enabled: boolean,
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await toggleSkill({ projectId, slug, enabled }, { skills: prismaSkillRepository });
  if (!result.ok) throw new Error(result.error);
}
