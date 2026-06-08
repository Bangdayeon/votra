"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export async function toggleToolAction(
  projectId: string,
  slug: string,
  isEnabled: boolean,
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  await prismaToolRepository.setEnabled(projectId, slug, isEnabled);
}
