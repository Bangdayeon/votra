"use server";

import { updateFolder } from "@/application/updateFolder";
import type { FolderRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function updateFolderAction(
  projectId: string,
  folderId: string,
  name: string,
): Promise<FolderRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await updateFolder(
    { id: folderId, projectId, name },
    { folders: prismaTaskFolderRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
