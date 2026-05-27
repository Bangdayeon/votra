import type { TaskFolderRepository } from "@/application/ports/taskFolderRepository";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function deleteFolder(
  id: string,
  projectId: string,
  deps: { folders: TaskFolderRepository },
): Promise<Result<true, string>> {
  try {
    const deleted = await deps.folders.delete(id, projectId);
    if (!deleted) return err("폴더를 찾을 수 없어요.");
    return ok(true);
  } catch (e) {
    return err(e instanceof Error ? e.message : "폴더 삭제에 실패했어요.");
  }
}
