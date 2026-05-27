"use server";

import { createFolder } from "@/application/createFolder";
import type { FolderRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export async function createFolderAction(projectId: string, name: string): Promise<FolderRecord> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await createFolder(
    { name, projectId, userId: guard.userId },
    { folders: prismaTaskFolderRepository },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
