"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";

export async function toggleCustomSkillAction(
  projectId: string,
  slug: string,
  isEnabled: boolean,
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  await prismaCustomSkillRepository.setEnabled(projectId, slug, isEnabled);
}
