import type { TaskFolderRepository } from "@/application/ports/taskFolderRepository";
import type { FolderRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listFolders(
  projectId: string,
  deps: { folders: TaskFolderRepository },
): Promise<Result<FolderRecord[], string>> {
  try {
    const folders = await deps.folders.listByProject(projectId);
    return ok(folders);
  } catch (e) {
    return err(e instanceof Error ? e.message : "폴더 목록을 불러오지 못했어요.");
  }
}
