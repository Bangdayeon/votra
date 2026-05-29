"use server";

import { reorderFolders } from "@/application/reorderFolders";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function reorderFoldersAction(
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await reorderFolders({ orderedIds }, { folders: prismaTaskFolderRepository });
  if (!result.ok) throw new Error(result.error);
}
