"use server";

import { deleteFolder } from "@/application/deleteFolder";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function deleteFolderAction(projectId: string, folderId: string): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await deleteFolder(folderId, projectId, { folders: prismaTaskFolderRepository });
  if (!result.ok) throw new Error(result.error);
}
