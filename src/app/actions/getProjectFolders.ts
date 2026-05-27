"use server";

import { listFolders } from "@/application/listFolders";
import type { FolderRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskFolderRepository } from "@/infrastructure/repositories/prismaTaskFolderRepository";

export type { FolderRecord };

export async function getProjectFoldersAction(projectId: string): Promise<FolderRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await listFolders(projectId, { folders: prismaTaskFolderRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
